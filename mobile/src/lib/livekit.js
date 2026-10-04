import { TokenSource } from 'livekit-client';

const TOKEN_SERVER_ID = process.env.EXPO_PUBLIC_LIVEKIT_TOKEN_SERVER_ID || '';

let _tokenSource = null;
export function getTokenSource() {
  if (!_tokenSource) {
    _tokenSource = TokenSource.developmentTokenServer(TOKEN_SERVER_ID);
  }
  return _tokenSource;
}

export async function getLiveKitToken(roomName, participantName) {
  const source = getTokenSource();
  const { serverUrl, participantToken } = await source.fetch({
    roomName,
    participantName,
  });
  return { serverUrl, token: participantToken };
}

export function roomNameForUser(userId) {
  return `voidbook-live-${userId}`;
}
