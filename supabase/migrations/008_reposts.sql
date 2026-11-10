-- ═══════════════════════════════════════════════════════════════
-- 008_reposts.sql
-- Makes "Echo" (share) work for posts you did not write.
--
-- The app used to bump `posts.shares` with a direct
-- `update posts set shares = shares + 1`. The `posts_update_self` policy only
-- permits `auth.uid() = author_id`, so sharing anyone else's post was silently
-- rejected by RLS — the button looked like it worked and the count reverted on
-- the next load. Editing a row you do not own to record your own action is the
-- wrong shape anyway.
--
-- This mirrors `likes` exactly: the action lives in its own table keyed by the
-- acting user, RLS only ever lets you write your own row, and a trigger keeps
-- the denormalised `posts.shares` counter in step for any other reader.
--
-- Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.reposts (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  post_id    uuid not null references public.posts(id)    on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table public.reposts enable row level security;

drop policy if exists "reposts_read_all"  on public.reposts;
drop policy if exists "reposts_insert_own" on public.reposts;
drop policy if exists "reposts_delete_own" on public.reposts;

create policy "reposts_read_all"   on public.reposts for select using (true);
create policy "reposts_insert_own" on public.reposts for insert with check (auth.uid() = user_id);
create policy "reposts_delete_own" on public.reposts for delete using (auth.uid() = user_id);

-- Keep `posts.shares` equal to the number of rows in `reposts`. The client reads
-- the count straight from `reposts`, so this column is only for other readers;
-- SECURITY DEFINER is required because the acting user cannot update a post they
-- do not own.
create or replace function public.sync_post_shares()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set shares = shares + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts set shares = greatest(0, shares - 1) where id = old.post_id;
    return old;
  end if;
  return null;
end $$;

drop trigger if exists on_repost_change on public.reposts;
create trigger on_repost_change
  after insert or delete on public.reposts
  for each row execute function public.sync_post_shares();

-- Backfill: the old counter drifted from reality (every non-author share was
-- dropped by RLS), so rebuild it from the reposts table, which is now the source
-- of truth. Written as `shares = count(reposts)` rather than `shares = 0` so a
-- re-run is a no-op instead of wiping the counts the trigger maintains.
update public.posts p
   set shares = (select count(*) from public.reposts r where r.post_id = p.id)
 where p.shares is distinct from
       (select count(*) from public.reposts r where r.post_id = p.id);

notify pgrst, 'reload schema';
