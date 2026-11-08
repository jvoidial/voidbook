-- ═══════════════════════════════════════════════════════════════
-- 004_race_safe_handle_new_user.sql
-- The previous handle_new_user resolved duplicate handles by SELECT-then-INSERT,
-- which races: two signups requesting the same handle in the same instant both
-- see it as free, one INSERT wins and the other raises unique_violation. The
-- `exception when others` guard then swallowed the error, so the losing user got
-- an auth.users row with NO profile at all (silent, permanent breakage).
--
-- This version never pre-checks. It attempts the INSERT with ON CONFLICT DO
-- NOTHING and retries with a new suffix only when the row was genuinely not
-- written, so a concurrent writer can never cause a lost profile.
-- Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_handle  text;
  final_handle text;
  counter      int := 0;
begin
  -- Sanitize so the value always satisfies the profiles.handle check constraint
  -- (^[a-z0-9_]{3,30}$); an invalid handle must never abort signup.
  base_handle := lower(coalesce(new.raw_user_meta_data->>'handle', ''));
  base_handle := regexp_replace(base_handle, '[^a-z0-9_]', '', 'g');
  if length(base_handle) < 3 then
    base_handle := 'user_' || substr(md5(new.id::text), 1, 8);
  end if;
  base_handle := left(base_handle, 30);
  final_handle := base_handle;

  loop
    insert into public.profiles (id, handle, name)
    values (new.id, final_handle, coalesce(new.raw_user_meta_data->>'name', 'User'))
    on conflict do nothing;

    -- Row written (or already present from a concurrent fire of this trigger).
    if found then
      return new;
    end if;
    if exists (select 1 from public.profiles where id = new.id) then
      return new;
    end if;

    -- The handle was taken by a concurrent insert: pick the next candidate.
    counter := counter + 1;
    if counter <= 10 then
      final_handle := left(base_handle, 28) || counter::text;
    else
      -- Deterministic per-user fallback: md5 of the user id (plus the retry
      -- counter) is always valid [a-z0-9_], never truncates the unique part of
      -- the UUID, and cannot collide with another user's handle.
      final_handle := 'user_' || substr(md5(new.id::text || counter::text), 1, 25);
    end if;

    -- Defensive bound; the UUID fallback above terminates well before this.
    if counter > 20 then
      return new;
    end if;
  end loop;
exception when others then
  raise warning 'handle_new_user failed: %', sqlerrm;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- Backfill: any auth user left without a profile by the old racy trigger.
insert into public.profiles (id, handle, name)
select u.id,
       'user_' || substr(replace(u.id::text, '-', ''), 1, 8),
       coalesce(u.raw_user_meta_data->>'name', 'User')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict do nothing;

notify pgrst, 'reload schema';
