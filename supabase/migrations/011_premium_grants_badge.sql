-- ═══════════════════════════════════════════════════════════════
-- Premium includes the blue checkmark.
--
-- The Premium modal sells "a verified badge on your profile and every post",
-- and `ProfileScreen`'s "Get Verified" button opens that same modal. But
-- `grant_premium_entitlement` only set `is_premium`, never `is_verified` or
-- `verified` — the two columns `BlueCheck` actually reads. So a paying user got
-- Premium with no badge anywhere in the app.
--
-- Grant both flags here, in the one place Premium is granted, so the badge and
-- the entitlement can never drift apart. The privilege guard honours this write
-- because the function sets `app.allow_privilege_change` first; the function is
-- still revoked from every client role, so this is not a new client path.
-- Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════════

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

  -- `verified` is kept in step because `BlueCheck` reads both columns.
  update public.profiles
     set is_premium = true, is_verified = true, verified = true
   where id = p_user_id;

  return true;
end $$;

-- Re-assert the grants: a `create or replace` preserves them, but stating them
-- makes the boundary explicit and survives a careless future rewrite.
revoke all on function public.grant_premium_entitlement(uuid, text, integer, text) from public;
revoke all on function public.grant_premium_entitlement(uuid, text, integer, text) from anon;
revoke all on function public.grant_premium_entitlement(uuid, text, integer, text) from authenticated;
grant execute on function public.grant_premium_entitlement(uuid, text, integer, text) to service_role;

-- Backfill: anyone already Premium (bought before this migration) gets the badge
-- they paid for. Guarded by the same trusted-context rule — the SQL editor runs
-- with no auth.uid(), so `protect_profile_privileges` allows it.
update public.profiles
   set is_verified = true, verified = true
 where is_premium and (not is_verified or not verified);

notify pgrst, 'reload schema';
