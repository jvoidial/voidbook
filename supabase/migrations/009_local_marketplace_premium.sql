-- ═══════════════════════════════════════════════════════════════
-- 009_local_marketplace_premium.sql
-- Backing tables for the Local directory (businesses + communities), the
-- Skills marketplace, and the `activate_premium` RPC the Premium modal calls.
--
-- The three tables did not exist, so every read the new screens perform would
-- have failed with `relation does not exist`; and the modal's Subscribe button
-- had nothing to call. Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════════

-- ── BUSINESSES (Local directory) ──────────────────────────────
create table if not exists public.businesses (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 120),
  city        text not null default '',
  category    text not null default 'other',
  description text not null default '',
  -- The "$1 to list" flow is a UI simulation until a payment provider is wired;
  -- the flag records that the (fake) fee step was completed.
  paid        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists businesses_city_idx     on public.businesses (city);
create index if not exists businesses_category_idx on public.businesses (category);

alter table public.businesses enable row level security;

drop policy if exists "businesses_read_all"   on public.businesses;
drop policy if exists "businesses_insert_own" on public.businesses;
drop policy if exists "businesses_update_own" on public.businesses;
drop policy if exists "businesses_delete_own" on public.businesses;

create policy "businesses_read_all"   on public.businesses for select using (true);
create policy "businesses_insert_own" on public.businesses for insert with check (auth.uid() = owner_id);
create policy "businesses_update_own" on public.businesses for update using (auth.uid() = owner_id);
create policy "businesses_delete_own" on public.businesses for delete using (auth.uid() = owner_id);

-- ── COMMUNITIES ───────────────────────────────────────────────
create table if not exists public.communities (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 120),
  city        text not null default '',
  description text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists communities_city_idx on public.communities (city);

alter table public.communities enable row level security;

drop policy if exists "communities_read_all"   on public.communities;
drop policy if exists "communities_insert_own" on public.communities;
drop policy if exists "communities_update_own" on public.communities;
drop policy if exists "communities_delete_own" on public.communities;

create policy "communities_read_all"   on public.communities for select using (true);
create policy "communities_insert_own" on public.communities for insert with check (auth.uid() = owner_id);
create policy "communities_update_own" on public.communities for update using (auth.uid() = owner_id);
create policy "communities_delete_own" on public.communities for delete using (auth.uid() = owner_id);

-- ── MARKETPLACE LISTINGS (Skills) ─────────────────────────────
-- `provider_id` is the FK the client embeds through:
--   select('*, provider:profiles(*)')
create table if not exists public.marketplace_listings (
  id          uuid primary key default uuid_generate_v4(),
  provider_id uuid not null references public.profiles(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  description text not null default '',
  price_cents int  not null default 0 check (price_cents >= 0),
  category    text not null default 'other',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists listings_provider_idx on public.marketplace_listings (provider_id);
create index if not exists listings_category_idx on public.marketplace_listings (category);

alter table public.marketplace_listings enable row level security;

drop policy if exists "listings_read_all"   on public.marketplace_listings;
drop policy if exists "listings_insert_own" on public.marketplace_listings;
drop policy if exists "listings_update_own" on public.marketplace_listings;
drop policy if exists "listings_delete_own" on public.marketplace_listings;

create policy "listings_read_all"   on public.marketplace_listings for select using (true);
create policy "listings_insert_own" on public.marketplace_listings for insert with check (auth.uid() = provider_id);
create policy "listings_update_own" on public.marketplace_listings for update using (auth.uid() = provider_id);
create policy "listings_delete_own" on public.marketplace_listings for delete using (auth.uid() = provider_id);

-- ── Realtime ──────────────────────────────────────────────────
-- Add the new tables to the Realtime publication so the Local and Marketplace
-- screens update when someone else posts. Guarded because `alter publication
-- ... add table` errors if the table is already a member.
do $$
begin
  begin
    alter publication supabase_realtime add table public.businesses;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.communities;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.marketplace_listings;
  exception when duplicate_object then null;
  end;
end $$;

-- ═══════════════════════════════════════════════════════════════
-- PREMIUM ACTIVATION
--
-- `protect_profile_privileges` (006) deliberately rejects any write to
-- is_premium by a non-admin, and a SECURITY DEFINER function does NOT bypass it:
-- auth.uid() still returns the caller inside the function, so the guard would
-- raise `privilege_columns_are_read_only`.
--
-- The escape hatch is a transaction-local GUC. `activate_premium` sets it
-- immediately before its own update, and the guard honours it only for the
-- duration of that transaction. A client cannot set this GUC through PostgREST,
-- so the privilege stays read-only everywhere except this one code path.
-- ═══════════════════════════════════════════════════════════════
create or replace function public.protect_profile_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  caller_is_admin boolean;
  claims_privilege boolean;
begin
  if auth.uid() is null then
    return new;
  end if;

  -- Transaction-local flag set only by a trusted SECURITY DEFINER function.
  if current_setting('app.allow_privilege_change', true) = 'on' then
    return new;
  end if;

  caller_is_admin := exists (select 1 from public.profiles where id = auth.uid() and is_admin);
  if caller_is_admin then
    return new;
  end if;

  if tg_op = 'INSERT' then
    claims_privilege := coalesce(new.is_admin, false) or coalesce(new.is_verified, false)
                     or coalesce(new.is_premium, false) or coalesce(new.verified, false);
  else
    claims_privilege := new.is_admin    is distinct from old.is_admin
                     or new.is_verified is distinct from old.is_verified
                     or new.is_premium  is distinct from old.is_premium
                     or new.verified    is distinct from old.verified;
  end if;

  if claims_privilege then
    raise exception 'privilege_columns_are_read_only'
      using hint = 'is_admin, is_verified, is_premium and verified can only be changed by an admin or the service role.';
  end if;

  return new;
end $$;

-- Activates premium for the caller. Idempotent. The payment provider is not
-- wired yet, so this grants the entitlement directly; when a real provider is
-- added, gate this call behind a verified webhook or server-side check.
create or replace function public.activate_premium()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using hint = 'Sign in before subscribing.';
  end if;

  perform set_config('app.allow_privilege_change', 'on', true);

  update public.profiles
     set is_premium = true
   where id = auth.uid();
end $$;

revoke all on function public.activate_premium() from public;
grant execute on function public.activate_premium() to authenticated;

notify pgrst, 'reload schema';
