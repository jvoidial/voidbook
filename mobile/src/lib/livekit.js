const WORKER_URL = process.env.EXPO_PUBLIC_WORKER_URL || '';
const TOKEN_SERVER_ID = process.env.EXPO_PUBLIC_LIVEKIT_TOKEN_SERVER_ID || '';

/**
 * Fetch a LiveKit token.
 * - If TOKEN_SERVER_ID is set, use LiveKit's dev token server (quick, insecure)
 * - Otherwise, use our Cloudflare Worker endpoint (production path)
 */
export async function getLiveKitToken(roomName, participantName) {
  // Prefer the Worker path — it's more secure and works even if the
  // dev token server isn't available on the account.
  const base = WORKER_URL.replace(/\/$/, '');
  const url = `${base}/livekit-token?room=${encodeURIComponent(roomName)}&identity=${encodeURIComponent(participantName)}`;

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LiveKit token fetch failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  if (!data.serverUrl || !data.participantToken) {
    throw new Error('Invalid token response from worker');
  }
  return { serverUrl: data.serverUrl, token: data.participantToken };
}

export function roomNameForUser(userId) {
  return `voidbook-live-${userId}`;
}
