-- Messaging RLS + trigger test. Runs against a real Postgres with the Supabase
-- surface stubbed by 00_harness.sql, then every migration applied in order.
--
-- Proves, for the "message any user" flow:
--   1. handle_new_user() creates a profile row on signup.
--   2. Any authenticated user can open a conversation with any other user.
--   3. A participant can insert and read messages in their own conversation.
--   4. The recipient can mark messages read.
--   5. A third party sees neither the conversation nor its messages.
\set ON_ERROR_STOP on

-- Fixture profiles exist (05_fixtures.sql). The whole test runs in a transaction
-- that rolls back, so it leaves no rows behind for the e2e suite that follows.
begin;

do $$
begin
  if (select count(*) from public.profiles
      where id in ('11111111-1111-1111-1111-111111111111',
                   '22222222-2222-2222-2222-222222222222',
                   '33333333-3333-3333-3333-333333333333')) <> 3 then
    raise exception 'handle_new_user did not create the 3 fixture profiles';
  end if;
end $$;

set role authenticated;

-- ── Alice opens a conversation with Bob and sends a message ───
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

insert into public.conversations (user_a, user_b)
values ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

insert into public.messages (conversation_id, sender_id, text)
select id, '11111111-1111-1111-1111-111111111111', 'hey bob'
from public.conversations;

do $$
begin
  if (select count(*) from public.messages) <> 1 then
    raise exception 'sender could not read back their own message';
  end if;
end $$;

-- ── Bob receives it and replies ───────────────────────────────
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);

do $$
begin
  if (select count(*) from public.messages) <> 1 then
    raise exception 'recipient cannot see the conversation message (got %)', (select count(*) from public.messages);
  end if;
  if (select count(*) from public.conversations) <> 1 then
    raise exception 'recipient cannot see the conversation';
  end if;
end $$;

insert into public.messages (conversation_id, sender_id, text)
select id, '22222222-2222-2222-2222-222222222222', 'hi alice'
from public.conversations;

-- Bob marks Alice's message read (the recipient-side update policy).
update public.messages set read = true
where sender_id = '11111111-1111-1111-1111-111111111111';

do $$
begin
  if (select count(*) from public.messages where read) <> 1 then
    raise exception 'recipient could not mark the message read';
  end if;
end $$;

-- ── Carol must see nothing ────────────────────────────────────
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);

do $$
begin
  if (select count(*) from public.messages) <> 0 then
    raise exception 'LEAK: a non-participant can read messages';
  end if;
  if (select count(*) from public.conversations) <> 0 then
    raise exception 'LEAK: a non-participant can read conversations';
  end if;
end $$;

-- ── Carol can still start a NEW conversation with Alice ───────
insert into public.conversations (user_a, user_b)
values ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333');

insert into public.messages (conversation_id, sender_id, text)
select id, '33333333-3333-3333-3333-333333333333', 'hi alice, carol here'
from public.conversations
where user_b = '33333333-3333-3333-3333-333333333333';

do $$
begin
  if (select count(*) from public.messages) <> 1 then
    raise exception 'a fresh participant cannot post to their own new conversation';
  end if;
end $$;

rollback;
select 'MESSAGING RLS TESTS PASSED' as result;
