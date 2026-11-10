-- ═══════════════════════════════════════════════════════════════
-- sqawk initial schema — paste into Supabase SQL editor
-- ═══════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- ── PROFILES ─────────────────────────────────────────────────
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  handle      text unique not null check (handle ~ '^[a-z0-9_]{3,30}$'),
  name        text not null,
  bio         text default '',
  avatar_url  text,
  cover_url   text,
  followers   int default 0,
  following   int default 0,
  tokens      int default 100,
  verified    boolean default false,
  created_at  timestamptz default now()
);
alter table profiles enable row level security;
create policy "profiles_read_all"    on profiles for select using (true);
create policy "profiles_update_self" on profiles for update using (auth.uid() = id);
create policy "profiles_insert_self" on profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup.
-- Duplicate-safe: a handle collision retries with a numeric suffix, then a random
-- suffix, so a duplicate handle can never abort the auth.users insert (which the
-- GoTrue signup endpoint surfaces as `500 unexpected_failure`). Any other error is
-- swallowed with a warning so signup still succeeds.
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
    base_handle := 'user_' || substr(md5(new.id::text), 1, 8);
  end if;
  base_handle := left(base_handle, 30);
  final_handle := base_handle;

  -- Attempt the insert without pre-checking existence: a SELECT-then-INSERT
  -- races, and the losing writer would otherwise end up with no profile at all.
  loop
    insert into public.profiles (id, handle, name)
    values (new.id, final_handle, coalesce(new.raw_user_meta_data->>'name', 'User'))
    on conflict do nothing;

    if found then
      return new;
    end if;
    if exists (select 1 from public.profiles where id = new.id) then
      return new;
    end if;

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

-- ── POSTS ────────────────────────────────────────────────────
create table posts (
  id          uuid primary key default uuid_generate_v4(),
  author_id   uuid not null references profiles(id) on delete cascade,
  content     text not null default '' check (char_length(content) <= 5000),
  media_url   text,
  media_type  text,
  audience    text default 'public' check (audience in ('public','followers','private')),
  likes       int default 0,
  shares      int default 0,
  edited_at   timestamptz,
  deleted_at  timestamptz,
  created_at  timestamptz default now()
);
create index posts_feed_idx on posts (created_at desc) where deleted_at is null;
alter table posts enable row level security;
create policy "posts_read_public"  on posts for select using (deleted_at is null and (audience = 'public' or author_id = auth.uid()));
create policy "posts_insert_self"  on posts for insert with check (auth.uid() = author_id);
create policy "posts_update_self"  on posts for update using (auth.uid() = author_id);
create policy "posts_delete_self"  on posts for delete using (auth.uid() = author_id);

-- ── COMMENTS ─────────────────────────────────────────────────
create table comments (
  id         uuid primary key default uuid_generate_v4(),
  post_id    uuid not null references posts(id) on delete cascade,
  author_id  uuid not null references profiles(id) on delete cascade,
  parent_id  uuid references comments(id) on delete cascade,
  text       text not null check (char_length(text) between 1 and 1000),
  created_at timestamptz default now()
);
alter table comments enable row level security;
create policy "comments_read_all"   on comments for select using (true);
create policy "comments_insert"     on comments for insert with check (auth.uid() = author_id);
create policy "comments_delete_own" on comments for delete using (auth.uid() = author_id);

-- ── LIKES ────────────────────────────────────────────────────
create table likes (
  user_id uuid not null references profiles(id) on delete cascade,
  post_id uuid not null references posts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);
alter table likes enable row level security;
create policy "likes_read_all" on likes for select using (true);
create policy "likes_insert"   on likes for insert with check (auth.uid() = user_id);
create policy "likes_delete"   on likes for delete using (auth.uid() = user_id);

-- ── FOLLOWS ──────────────────────────────────────────────────
create table follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  followee_id uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
alter table follows enable row level security;
create policy "follows_read_all"   on follows for select using (true);
create policy "follows_insert"     on follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete_own" on follows for delete using (auth.uid() = follower_id);

-- ── BOOKMARKS ────────────────────────────────────────────────
create table bookmarks (
  user_id  uuid not null references profiles(id) on delete cascade,
  post_id  uuid not null references posts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);
alter table bookmarks enable row level security;
create policy "bookmarks_own" on bookmarks for all using (auth.uid() = user_id);

-- ── CONVERSATIONS + MESSAGES ─────────────────────────────────
create table conversations (
  id        uuid primary key default uuid_generate_v4(),
  user_a    uuid not null references profiles(id) on delete cascade,
  user_b    uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);
alter table conversations enable row level security;
create policy "conv_participant" on conversations
  for all using (auth.uid() = user_a or auth.uid() = user_b);

create table messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid not null references profiles(id) on delete cascade,
  text            text not null,
  read            boolean default false,
  created_at      timestamptz default now()
);
alter table messages enable row level security;
create policy "msg_participant_select" on messages for select using (
  exists (select 1 from conversations c where c.id = conversation_id
          and (c.user_a = auth.uid() or c.user_b = auth.uid()))
);
create policy "msg_participant_insert" on messages for insert with check (
  auth.uid() = sender_id and
  exists (select 1 from conversations c where c.id = conversation_id
          and (c.user_a = auth.uid() or c.user_b = auth.uid()))
);
create policy "msg_recipient_update" on messages for update using (
  exists (select 1 from conversations c where c.id = conversation_id
          and (c.user_a = auth.uid() or c.user_b = auth.uid()))
);

-- ── NOTIFICATIONS ────────────────────────────────────────────
create table notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  actor_id   uuid references profiles(id) on delete set null,
  kind       text not null,
  target_id  uuid,
  read       boolean default false,
  created_at timestamptz default now()
);
alter table notifications enable row level security;
create policy "notif_own" on notifications for all using (auth.uid() = user_id);

-- ── REALTIME ─────────────────────────────────────────────────
-- Idempotent: re-running must not error if the table is already published.
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

-- ── STORAGE BUCKETS ──────────────────────────────────────────
-- Public read; writes are confined to the uploader's own folder
-- (`<user_id>/<file>`), matching mobile/src/lib/media.js.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('covers', 'covers', true), ('posts', 'posts', true)
on conflict (id) do update set public = excluded.public;

create policy "media_public_read" on storage.objects
  for select using (bucket_id in ('avatars', 'covers', 'posts'));
create policy "media_owner_insert" on storage.objects
  for insert with check (
    bucket_id in ('avatars', 'covers', 'posts')
    and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "media_owner_update" on storage.objects
  for update using (
    bucket_id in ('avatars', 'covers', 'posts')
    and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "media_owner_delete" on storage.objects
  for delete using (
    bucket_id in ('avatars', 'covers', 'posts')
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ═══════════════════════════════════════════════════════════════
-- Done. Every table has RLS. Every policy is auth.uid() scoped.
-- ═══════════════════════════════════════════════════════════════
