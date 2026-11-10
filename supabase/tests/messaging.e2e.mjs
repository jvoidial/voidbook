// End-to-end messaging test through the real stack the app uses:
//   supabase-js  ->  PostgREST (JWT role-switching)  ->  Postgres + RLS
//
// This is what actually catches "messaging is broken": the client query shape,
// the JWT plumbing, and the RLS policies, together.
//
//   node supabase/tests/messaging.e2e.mjs
//
// Requires the postgrest container from supabase/tests/run.sh to be reachable at
// POSTGREST_URL (default http://localhost:3000).
import { createHmac } from 'node:crypto';
import { createRequire } from 'node:module';

// @supabase/supabase-js is the app's dependency, installed under mobile/. Resolve
// it from there so this test can live with the SQL tests.
const require = createRequire(new URL('../../mobile/package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');

const BASE_URL = process.env.POSTGREST_URL || 'http://localhost:3000';
const ALICE = '11111111-1111-1111-1111-111111111111';
const BOB = '22222222-2222-2222-2222-222222222222';
const CAROL = '33333333-3333-3333-3333-333333333333';

// A real HS256-signed JWT, matching how Supabase signs. PostgREST verifies the
// signature against PGRST_JWT_SECRET and switches to the `role` claim.
const JWT_SECRET = process.env.PGRST_JWT_SECRET || 'test-secret-at-least-32-characters-long';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (sub, role = 'authenticated') => {
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64({ role, sub, aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 });
  const sig = createHmac('sha256', JWT_SECRET).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
};

// supabase-js targets a Supabase project URL and prefixes REST calls with
// `/rest/v1` (Supabase serves PostgREST behind Kong at that path). A bare
// PostgREST serves at the root, so rewrite the path. Everything else about the
// client — query building, headers, error handling — is the real thing.
const shimFetch = (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input.url);
  url.pathname = url.pathname.replace(/^\/rest\/v1/, '') || '/';
  return fetch(url, init);
};

const clientFor = (id) =>
  createClient(BASE_URL, 'anon', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${jwt(id)}` },
      fetch: shimFetch,
    },
  });

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log(`  PASS ${msg}`);
  else { console.log(`  FAIL ${msg}`); failures++; }
};

const alice = clientFor(ALICE);
const bob = clientFor(BOB);
const carol = clientFor(CAROL);

console.log('messaging e2e');

// 1. The new-message picker: profiles readable, self excluded.
{
  const { data, error } = await alice.from('profiles').select('id, name, handle').neq('id', ALICE);
  ok(!error, `profiles picker query succeeds${error ? ` (${error.message})` : ''}`);
  ok((data || []).length === 2, `picker returns the other 2 users (got ${data?.length})`);
  ok((data || []).every((u) => u.id !== ALICE), 'picker excludes self');
  ok((data || []).every((u) => u.name && u.name !== 'Unknown'), 'picker users have real names (not Unknown)');
}

// 2. Alice opens a conversation with Bob (the ordered-pair upsert).
let convId;
{
  const [a, b] = ALICE < BOB ? [ALICE, BOB] : [BOB, ALICE];
  const { data, error } = await alice.from('conversations')
    .upsert({ user_a: a, user_b: b }, { onConflict: 'user_a,user_b' })
    .select().single();
  ok(!error, `create conversation succeeds${error ? ` (${error.message})` : ''}`);
  convId = data?.id;
  ok(!!convId, 'conversation has an id');
}

// 3. Re-running createConversation must return the same conversation, not error.
{
  const [a, b] = ALICE < BOB ? [ALICE, BOB] : [BOB, ALICE];
  const { data, error } = await alice.from('conversations')
    .upsert({ user_a: a, user_b: b }, { onConflict: 'user_a,user_b' })
    .select().single();
  ok(!error, `re-open is idempotent${error ? ` (${error.message})` : ''}`);
  ok(data?.id === convId, 're-open returns the same conversation id');
}

// 4. Alice sends a message.
{
  const { data, error } = await alice.from('messages')
    .insert({ conversation_id: convId, sender_id: ALICE, text: 'hey bob' })
    .select('*').single();
  ok(!error, `send message succeeds${error ? ` (${error.message})` : ''}`);
  ok(data?.from === undefined && data?.sender_id === ALICE, 'message row has sender_id');
}

// 5. Bob loads his conversation list the way AppContext does, and sees it.
{
  const { data, error } = await bob.from('conversations')
    .select('*, messages(*)').or(`user_a.eq.${BOB},user_b.eq.${BOB}`);
  ok(!error, `recipient conversation query succeeds${error ? ` (${error.message})` : ''}`);
  const conv = (data || []).find((c) => c.id === convId);
  ok(!!conv, 'recipient sees the conversation');
  ok((conv?.messages || []).length === 1, 'recipient sees the message (nested join works)');
  ok(conv?.messages?.[0]?.text === 'hey bob', 'message text is intact');
}

// 6. Bob replies, then marks Alice's message read.
{
  const { error: sendErr } = await bob.from('messages')
    .insert({ conversation_id: convId, sender_id: BOB, text: 'hi alice' });
  ok(!sendErr, `recipient can reply${sendErr ? ` (${sendErr.message})` : ''}`);

  const { error } = await bob.from('messages').update({ read: true })
    .eq('conversation_id', convId).neq('sender_id', BOB);
  ok(!error, `recipient can mark messages read${error ? ` (${error.message})` : ''}`);
}

// 7. Carol is not a participant and must see nothing.
{
  const { data } = await carol.from('messages').select('*').eq('conversation_id', convId);
  ok((data || []).length === 0, 'non-participant sees no messages');
  const { data: convs } = await carol.from('conversations').select('*');
  ok((convs || []).length === 0, 'non-participant sees no conversations');
}

// 8. Carol can still start a conversation with Alice (message anyone).
{
  const [a, b] = ALICE < CAROL ? [ALICE, CAROL] : [CAROL, ALICE];
  const { data, error } = await carol.from('conversations')
    .upsert({ user_a: a, user_b: b }, { onConflict: 'user_a,user_b' })
    .select().single();
  ok(!error && !!data?.id, `a new user can start a conversation with anyone${error ? ` (${error.message})` : ''}`);

  const { error: sendErr } = await carol.from('messages')
    .insert({ conversation_id: data.id, sender_id: CAROL, text: 'hi alice' });
  ok(!sendErr, `the new user can post to it${sendErr ? ` (${sendErr.message})` : ''}`);
}

// 9. A user cannot send as someone else.
{
  const { error } = await carol.from('messages')
    .insert({ conversation_id: convId, sender_id: ALICE, text: 'spoofed' });
  ok(!!error, 'spoofing another sender is rejected');
}

// 10. The Realtime catch-up path: a recipient who does not yet have the
// conversation fetches it by id, with messages, and gets the whole thread.
{
  const { data, error } = await bob.from('conversations')
    .select('*, messages(*)').eq('id', convId).maybeSingle();
  ok(!error, `recipient can fetch a conversation by id${error ? ` (${error.message})` : ''}`);
  ok(!!data, 'recipient gets the conversation row');
  ok((data?.messages || []).length === 2, 'the fetched conversation carries its messages');
}

// 11. A non-participant fetching the same id gets nothing — which is what makes
// the catch-up path safe to run for every Realtime message.
{
  const { data } = await carol.from('conversations')
    .select('*, messages(*)').eq('id', convId).maybeSingle();
  ok(!data, 'non-participant fetch by id returns nothing');
}

// 12. The feed query embeds the author, which is what stops posts rendering as
// "Unknown" when the author is outside the profiles page window.
{
  const { data: inserted, error: postErr } = await alice.from('posts')
    .insert({ content: 'hello world', author_id: ALICE })
    .select('*, author:profiles!author_id(*)').single();
  ok(!postErr, `posting with an embedded author succeeds${postErr ? ` (${postErr.message})` : ''}`);
  ok(inserted?.author?.name === 'Alice', 'the embedded author resolves to a real profile');

  const { data: feed, error } = await bob.from('posts')
    .select('*, author:profiles!author_id(*)').is('deleted_at', null)
    .order('created_at', { ascending: false }).limit(100);
  ok(!error, `feed query succeeds${error ? ` (${error.message})` : ''}`);
  const row = (feed || []).find((p) => p.id === inserted?.id);
  ok(!!row, 'another user sees the post');
  ok(row?.author?.name === 'Alice', 'the post carries its author profile (not Unknown)');
}

console.log(failures === 0 ? '\nMESSAGING E2E PASSED' : `\nMESSAGING E2E FAILED (${failures})`);
process.exit(failures === 0 ? 0 : 1);
