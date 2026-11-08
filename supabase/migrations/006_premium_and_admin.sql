-- ═══════════════════════════════════════════════════════════════
-- 006_premium_and_admin.sql
-- Adds the monetization / privilege flags and the guard that keeps them safe.
-- Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════════

-- ── Columns ───────────────────────────────────────────────────
alter table public.profiles add column if not exists is_verified boolean not null default false;
alter table public.profiles add column if not exists is_premium  boolean not null default false;
alter table public.profiles add column if not exists is_admin    boolean not null default false;

-- The client renders the checkmark off `verified`; keep the two in step so a
-- single source of truth can never disagree with itself.
update public.profiles set verified = is_verified where verified is distinct from is_verified;

-- ═══════════════════════════════════════════════════════════════
-- PRIVILEGE PROTECTION
--
-- Row Level Security cannot restrict *columns*. The existing
-- `profiles_update_self` policy is `using (auth.uid() = id)`, which permits an
-- authenticated user to write EVERY column of their own row — including
-- is_admin. Without the guard below, any user could grant themselves the admin
-- panel with a single API call.
--
-- A BEFORE trigger is the correct tool: it sees both OLD and NEW, so it can
-- tell a harmless self-edit (bio, avatar) from a privilege change, and it
-- survives direct PostgREST calls as well as SQL.
--
-- It must cover INSERT as well as UPDATE. `profiles_insert_self` is
-- `with check (auth.uid() = id)`, so a user whose row is missing can insert a
-- replacement — and `insert ... on conflict do update` is an upsert, which
-- reaches both paths. A guard on UPDATE alone would leave that door open.
--
-- `verified` is guarded too. It is the older column of the pair and the UI
-- reads it, so leaving it out would allow self-verification through
-- `update({ verified: true })` without touching is_verified.
-- ═══════════════════════════════════════════════════════════════
create or replace function public.protect_profile_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  caller_is_admin boolean;
  claims_privilege boolean;
begin
  -- Trusted contexts: the service_role key, CI, and the SQL editor all run with
  -- no end-user identity, so `auth.uid()` is NULL. A logged-in client always
  -- has one. Note this cannot be tested with `current_user`: inside a
  -- SECURITY DEFINER function that is the function owner (postgres), not the
  -- caller, so the check would always pass and the guard would be useless.
  if auth.uid() is null then
    return new;
  end if;

  caller_is_admin := exists (select 1 from public.profiles where id = auth.uid() and is_admin);
  if caller_is_admin then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- A new row may not arrive already privileged; the column default is false.
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

drop trigger if exists profiles_protect_privileges on public.profiles;
create trigger profiles_protect_privileges
  before insert or update on public.profiles
  for each row execute function public.protect_profile_privileges();

-- ═══════════════════════════════════════════════════════════════
-- ADMIN RPC
--
-- The admin panel needs to write another user's row, which `profiles_update_self`
-- forbids. This SECURITY DEFINER function performs that one narrow action, and
-- re-checks admin status inside itself so a non-admin caller cannot use it.
-- It is the only privilege-changing path available to the app.
-- ═══════════════════════════════════════════════════════════════
create or replace function public.admin_set_verified(target_id uuid, value boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'not_authorised' using hint = 'Only an admin can change verification.';
  end if;

  -- `verified` is kept in step because the UI reads that column.
  update public.profiles
     set is_verified = value, verified = value
   where id = target_id;
end $$;

revoke all on function public.admin_set_verified(uuid, boolean) from public;
grant execute on function public.admin_set_verified(uuid, boolean) to authenticated;

-- ── PostgREST schema cache ────────────────────────────────────
notify pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════════
-- GRANT MASTER ADMIN
--
-- Run this AFTER signing up through the app with the real email. Never insert a
-- password by hand: sign up normally, confirm the email, then flip the flag.
-- The trigger above permits this because the SQL editor runs with no auth.uid().
-- ═══════════════════════════════════════════════════════════════
update public.profiles
   set is_admin = true, is_verified = true, verified = true, is_premium = true
 where id = (select id from auth.users where email = 'master.jacobgrainger@gmail.com');
