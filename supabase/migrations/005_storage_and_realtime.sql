-- ═══════════════════════════════════════════════════════════════
-- 005_storage_and_realtime.sql
-- Makes the Storage policies and the Realtime publication re-appliable to a
-- database provisioned from an older schema. 001_init.sql used a bare
-- `create policy`, which errors on re-run, so the repair path needs drop+create.
-- Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════════

-- ── Buckets ───────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('covers', 'covers', true), ('posts', 'posts', true)
on conflict (id) do update set public = excluded.public;

-- ── Storage object policies ───────────────────────────────────
-- Files are stored at `<user_id>/<file>` (see mobile/src/lib/media.js), so the
-- first folder segment must equal the caller's uid. `(select auth.uid())` is
-- evaluated once per statement rather than once per row.
drop policy if exists "media_public_read"  on storage.objects;
drop policy if exists "media_owner_insert" on storage.objects;
drop policy if exists "media_owner_update" on storage.objects;
drop policy if exists "media_owner_delete" on storage.objects;

create policy "media_public_read" on storage.objects
  for select using (bucket_id in ('avatars', 'covers', 'posts'));

create policy "media_owner_insert" on storage.objects
  for insert to authenticated with check (
    bucket_id in ('avatars', 'covers', 'posts')
    and (select auth.uid()::text) = (storage.foldername(name))[1]
  );

create policy "media_owner_update" on storage.objects
  for update to authenticated using (
    bucket_id in ('avatars', 'covers', 'posts')
    and (select auth.uid()::text) = (storage.foldername(name))[1]
  );

create policy "media_owner_delete" on storage.objects
  for delete to authenticated using (
    bucket_id in ('avatars', 'covers', 'posts')
    and (select auth.uid()::text) = (storage.foldername(name))[1]
  );

-- ── Realtime publication ──────────────────────────────────────
-- Realtime only streams tables that are members of supabase_realtime. The client
-- subscribes to these four; a missing member fails silently (no error, no event).
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

-- Realtime applies RLS to SELECT; these tables must be readable by the
-- subscribing role or the events are dropped on the floor.
notify pgrst, 'reload schema';
