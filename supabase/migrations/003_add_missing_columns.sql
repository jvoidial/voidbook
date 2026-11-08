-- ═══════════════════════════════════════════════════════════════
-- 003_add_missing_columns.sql
-- Repair migration for a database provisioned from an older schema.
-- The app writes these columns but the live DB is missing them, e.g.
--   "Could not find the 'media_type' column of 'posts' in the schema cache".
-- Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════════

-- Posts: image/video attachment + soft-delete/edit bookkeeping
alter table public.posts add column if not exists media_url  text;
alter table public.posts add column if not exists media_type text;
alter table public.posts add column if not exists audience   text default 'public';
alter table public.posts add column if not exists likes      int  default 0;
alter table public.posts add column if not exists shares     int  default 0;
alter table public.posts add column if not exists edited_at  timestamptz;
alter table public.posts add column if not exists deleted_at timestamptz;

-- Profiles: avatars, covers and counters
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists cover_url  text;
alter table public.profiles add column if not exists bio        text default '';
alter table public.profiles add column if not exists tokens     int  default 100;
alter table public.profiles add column if not exists verified   boolean default false;
alter table public.profiles add column if not exists followers  int  default 0;
alter table public.profiles add column if not exists following  int  default 0;

-- Notifications: the column the client maps to a notification "type"
alter table public.notifications add column if not exists kind text;

-- ── PostgREST schema cache ────────────────────────────────────
-- Supabase caches the schema; without this the API keeps reporting the
-- columns as missing until the next automatic refresh.
notify pgrst, 'reload schema';
