-- ═══════════════════════════════════════════════════════════════
-- Gate Premium behind a verified payment.
--
-- 009 shipped `activate_premium()` as a stopgap that grants the entitlement to
-- any signed-in caller, on the assumption it would be gated "when a real
-- provider is added". The provider is now wired, and the ungated RPC is a live
-- hole: `supabase.rpc('activate_premium')` needs no payment at all, so anyone
-- with an account can take Premium for free. This migration closes it.
--
-- The entitlement is now granted only by `grant_premium_entitlement`, which the
-- `create-payment-intent` edge function calls with the service role key after
-- Stripe confirms the PaymentIntent succeeded. The client-callable wrapper is
-- dropped entirely, so there is no path from the app to `is_premium = true`.
-- Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════════

-- Records one successful charge per PaymentIntent. Doubles as the idempotency
-- guard: a replayed call cannot extend Premium twice.
create table if not exists public.premium_purchases (
  payment_intent_id text primary key,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  amount            integer not null,
  currency          text not null,
  created_at        timestamptz not null default now()
);

create index if not exists premium_purchases_user_idx on public.premium_purchases (user_id);

alter table public.premium_purchases enable row level security;

-- A user may read their own receipts. Writes come only from the edge function's
-- service role, which bypasses RLS.
drop policy if exists "premium_purchases_read_own" on public.premium_purchases;
create policy "premium_purchases_read_own" on public.premium_purchases
  for select using (auth.uid() = user_id);

-- ── Entitlement grant ──────────────────────────────────────────
-- Called only from the edge function, which reaches Postgres with the service
-- role. EXECUTE is therefore revoked from every client role; without this the
-- function would be callable straight from PostgREST and would be no safer than
-- the RPC it replaces.
create or replace function public.grant_premium_entitlement(
  p_user_id          uuid,
  p_payment_intent_id text,
  p_amount           integer,
  p_currency         text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Idempotent: a duplicate webhook/retry is a no-op, not a second grant.
  insert into public.premium_purchases (payment_intent_id, user_id, amount, currency)
  values (p_payment_intent_id, p_user_id, p_amount, p_currency)
  on conflict (payment_intent_id) do nothing;

  if not found then
    return false;
  end if;

  -- Set only here, so the profile guard honours the write. The transaction-local
  -- flag cannot be set by a client through PostgREST.
  perform set_config('app.allow_privilege_change', 'on', true);

  update public.profiles set is_premium = true where id = p_user_id;

  return true;
end $$;

revoke all on function public.grant_premium_entitlement(uuid, text, integer, text) from public;
revoke all on function public.grant_premium_entitlement(uuid, text, integer, text) from anon;
revoke all on function public.grant_premium_entitlement(uuid, text, integer, text) from authenticated;
grant execute on function public.grant_premium_entitlement(uuid, text, integer, text) to service_role;

-- Remove the ungated path. `if exists` keeps this re-runnable.
drop function if exists public.activate_premium();

notify pgrst, 'reload schema';
