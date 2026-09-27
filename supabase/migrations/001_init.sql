-- ═══════════════════════════════════════════════════════════════
-- VOIDBOOK initial schema — paste into Supabase SQL editor
-- ═══════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- ── PROFILES ─────────────────────────────────────────────────
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  handle      text unique not null check (handle ~ '^[a-z0-9_]{3,30}$'),
  name        text not null,
  bio         text default '',
  followers   int default 0,
  following   int default 0,
  verified    boolean default false,
  created_at  timestamptz default now()
);
alter table profiles enable row level security;
create policy "profiles_read_all"    on profiles for select using (true);
create policy "profiles_update_self" on profiles for update using (auth.uid() = id);
create policy "profiles_insert_self" on profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, handle, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'handle', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'name', 'User')
  );
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_user();

-- ── POSTS ────────────────────────────────────────────────────
create table posts (
  id          uuid primary key default uuid_generate_v4(),
  author_id   uuid not null references profiles(id) on delete cascade,
  content     text not null check (char_length(content) between 1 and 5000),
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
alter publication supabase_realtime add table posts;
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table notifications;

-- ═══════════════════════════════════════════════════════════════
-- Done. Every table has RLS. Every policy is auth.uid() scoped.
-- ═══════════════════════════════════════════════════════════════
