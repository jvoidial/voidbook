-- ═══════════════════════════════════════════════════════════════
-- 007_notifications.sql
-- Populates the notifications table from real activity.
--
-- Until now nothing ever INSERTed into `public.notifications`. The client read
-- the table and subscribed to its Realtime stream, but with no producer the
-- feed was permanently empty — so "Notifications" showed "You're all caught up"
-- no matter how much activity there was.
--
-- The write happens in the database rather than the app: a trigger fires for
-- every writer (app, SQL editor, future edge function), and it cannot be
-- skipped by a client that forgets to call it.
--
-- Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════════

-- The app maps notifications.kind → a UI "type", so these strings must match
-- the icons/labels in NotificationsScreen: like, comment, follow.
--
-- Every function below is SECURITY DEFINER for one reason: `notif_own` is
-- `using (auth.uid() = user_id)`, so the acting user cannot insert a row that
-- belongs to someone else. The trigger runs as the function owner, which is
-- not subject to that policy. Without it the inserts would silently no-op.
--
-- Each function swallows its own errors. A notification is a side effect: if it
-- fails it must never roll back the like/comment/follow that caused it.
--
-- recipient is always the content owner, never the actor — self-actions are
-- skipped so you are not notified about your own activity.

-- ── Likes ─────────────────────────────────────────────────────
-- `likes` has PK (user_id, post_id), so a like is a single row that can be
-- deleted and re-inserted. Without the dedupe below, an unlike/relike cycle
-- would add a notification every time.
create or replace function public.notify_on_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  owner_id uuid;
begin
  select author_id into owner_id from public.posts where id = new.post_id;
  if owner_id is null or owner_id = new.user_id then
    return new;
  end if;

  insert into public.notifications (user_id, actor_id, kind, target_id)
  select owner_id, new.user_id, 'like', new.post_id
  where not exists (
    select 1 from public.notifications n
     where n.user_id  = owner_id
       and n.actor_id = new.user_id
       and n.kind     = 'like'
       and n.target_id = new.post_id
  );
  return new;
exception when others then
  raise warning 'notify_on_like failed: %', sqlerrm;
  return new;
end $$;

drop trigger if exists on_like_created on public.likes;
create trigger on_like_created
  after insert on public.likes
  for each row execute function public.notify_on_like();

-- ── Comments ──────────────────────────────────────────────────
-- No dedupe here: unlike a like, each comment is new content and deserves its
-- own notification.
create or replace function public.notify_on_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  owner_id uuid;
begin
  select author_id into owner_id from public.posts where id = new.post_id;
  if owner_id is null or owner_id = new.author_id then
    return new;
  end if;

  insert into public.notifications (user_id, actor_id, kind, target_id)
  values (owner_id, new.author_id, 'comment', new.post_id);
  return new;
exception when others then
  raise warning 'notify_on_comment failed: %', sqlerrm;
  return new;
end $$;

drop trigger if exists on_comment_created on public.comments;
create trigger on_comment_created
  after insert on public.comments
  for each row execute function public.notify_on_comment();

-- ── Follows ───────────────────────────────────────────────────
-- Deduped for the same reason as likes: `follows` has PK (follower_id,
-- followee_id), so unfollow/refollow would otherwise repeat the notification.
-- target_id carries the follower, which is what the UI links to.
create or replace function public.notify_on_follow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.followee_id = new.follower_id then
    return new;
  end if;

  insert into public.notifications (user_id, actor_id, kind, target_id)
  select new.followee_id, new.follower_id, 'follow', new.follower_id
  where not exists (
    select 1 from public.notifications n
     where n.user_id  = new.followee_id
       and n.actor_id = new.follower_id
       and n.kind     = 'follow'
  );
  return new;
exception when others then
  raise warning 'notify_on_follow failed: %', sqlerrm;
  return new;
end $$;

drop trigger if exists on_follow_created on public.follows;
create trigger on_follow_created
  after insert on public.follows
  for each row execute function public.notify_on_follow();

-- ── Backfill ──────────────────────────────────────────────────
-- Reconstruct notifications for activity that predates this migration, so the
-- tab is not empty for existing users. Guarded by the same dedupe rules, so a
-- re-run is a no-op.
insert into public.notifications (user_id, actor_id, kind, target_id, created_at)
select p.author_id, l.user_id, 'like', l.post_id, l.created_at
  from public.likes l
  join public.posts p on p.id = l.post_id
 where p.author_id <> l.user_id
   and not exists (
     select 1 from public.notifications n
      where n.user_id = p.author_id and n.actor_id = l.user_id
        and n.kind = 'like' and n.target_id = l.post_id);

insert into public.notifications (user_id, actor_id, kind, target_id, created_at)
select p.author_id, c.author_id, 'comment', c.post_id, c.created_at
  from public.comments c
  join public.posts p on p.id = c.post_id
 where p.author_id <> c.author_id
   and not exists (
     select 1 from public.notifications n
      where n.user_id = p.author_id and n.actor_id = c.author_id
        and n.kind = 'comment' and n.target_id = c.post_id
        and n.created_at = c.created_at);

insert into public.notifications (user_id, actor_id, kind, target_id, created_at)
select f.followee_id, f.follower_id, 'follow', f.follower_id, f.created_at
  from public.follows f
 where f.followee_id <> f.follower_id
   and not exists (
     select 1 from public.notifications n
      where n.user_id = f.followee_id and n.actor_id = f.follower_id
        and n.kind = 'follow');

-- ── PostgREST schema cache ────────────────────────────────────
notify pgrst, 'reload schema';
