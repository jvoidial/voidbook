// Supabase Edge Function: daily-token
//
// Mints a Daily.co meeting token for the signed-in caller and returns the room
// URL. The Daily API key never reaches the client: it lives here as the
// DAILY_API_KEY secret.
//
// Deploy:
//   supabase secrets set DAILY_API_KEY="..."
//   supabase functions deploy daily-token
//
// Request  (POST, Authorization: Bearer <supabase access token>):
//   { "title": "My stream", "mode": "video" | "audio" }
// Response:
//   { "url": "https://<sub>.daily.co/<room>", "token": "<meeting token>",
//     "room": "<room name>", "isOwner": true }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DAILY_API = 'https://api.daily.co/v1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

// Daily room names must be a URL-safe slug.
function slug(title: string, owner: string) {
  const base = (title || 'live')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const suffix = owner.replace(/-/g, '').slice(0, 8);
  return `${base || 'live'}-${suffix}`;
}

async function daily(path: string, init: RequestInit, key: string) {
  const res = await fetch(`${DAILY_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(data?.error || data?.info || `daily ${res.status}`);
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const key = Deno.env.get('DAILY_API_KEY');
  if (!key) return json({ error: 'server_misconfigured', detail: 'DAILY_API_KEY not set' }, 500);

  // Identify the caller from their Supabase JWT. The anon key alone is not
  // enough: we need a real user id so the token can be scoped to them.
  const authHeader = req.headers.get('Authorization') || '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: 'not_authenticated' }, 401);

  let body: { title?: string; mode?: string; room?: string } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine; fall back to defaults
  }

  const roomName = (body.room || slug(body.title || 'live', user.id)).slice(0, 60);

  try {
    // Create the room if it does not exist yet. `get` first so a second caller
    // (a viewer joining the same stream) reuses the room instead of erroring.
    let room;
    try {
      room = await daily(`/rooms/${roomName}`, { method: 'GET' }, key);
    } catch {
      room = await daily('/rooms', {
        method: 'POST',
        body: JSON.stringify({
          name: roomName,
          privacy: 'public',
          properties: {
            // Audio-only rooms start with the camera off for everyone.
            start_video_off: body.mode === 'audio',
            start_audio_off: false,
            enable_chat: true,
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 4, // 4h
          },
        }),
      }, key);
    }

    const token = await daily('/meeting-tokens', {
      method: 'POST',
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_name: user.email ?? user.id,
          is_owner: true,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 4,
        },
      }),
    }, key);

    return json({ url: room.url, token: token.token, room: roomName, isOwner: true });
  } catch (e) {
    return json({ error: 'daily_request_failed', detail: String((e as Error)?.message || e) }, 502);
  }
});
