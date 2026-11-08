-- ═══════════════════════════════════════════════════════════════
-- sqawk repair migration — run against an already-provisioned database.
-- Idempotent: safe to re-run.
--   * fixes the `500 unexpected_failure` signup crash (duplicate handle)
--   * adds columns the app writes that 001 originally omitted
-- ═══════════════════════════════════════════════════════════════

-- 1. Missing columns -------------------------------------------------------
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists cover_url  text;
alter table public.profiles add column if not exists tokens     int default 100;

alter table public.posts add column if not exists media_url  text;
alter table public.posts add column if not exists media_type text;
alter table public.posts alter column content set default '';

-- 2. Duplicate-safe signup trigger ----------------------------------------
drop trigger if exists on_auth_user_created on auth.users;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_handle text;
  final_handle text;
  counter int := 0;
begin
  -- Sanitize so the value always satisfies the profiles.handle check constraint;
  -- an invalid handle must never abort signup.
  base_handle := lower(coalesce(new.raw_user_meta_data->>'handle', ''));
  base_handle := regexp_replace(base_handle, '[^a-z0-9_]', '', 'g');
  if length(base_handle) < 3 then
    base_handle := 'user_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  base_handle := left(base_handle, 30);
  final_handle := base_handle;
  while exists (select 1 from public.profiles where handle = final_handle) loop
    counter := counter + 1;
    final_handle := base_handle || counter::text;
    if counter > 10 then
      final_handle := base_handle || '_' || substr(md5(random()::text), 1, 4);
      exit;
    end if;
  end loop;
  insert into public.profiles (id, handle, name)
  values (new.id, final_handle, coalesce(new.raw_user_meta_data->>'name', 'User'));
  return new;
exception when others then
  raise warning 'handle_new_user failed: %', sqlerrm;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- 3. Realtime + storage (idempotent) --------------------------------------
do $$
declare t text;
begin
  foreach t in array array['posts', 'comments', 'messages', 'notifications']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('covers', 'covers', true), ('posts', 'posts', true)
on conflict (id) do update set public = excluded.public;
