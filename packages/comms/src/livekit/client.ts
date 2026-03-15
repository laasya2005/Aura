import { RoomServiceClient, SipClient, AccessToken } from "livekit-server-sdk";

let roomServiceClient: RoomServiceClient | null = null;
let sipClient: SipClient | null = null;

function getLivekitUrl(): string {
  const url = process.env.LIVEKIT_URL;
  if (!url) throw new Error("LIVEKIT_URL must be set");
  return url;
}

function getApiKey(): string {
  const key = process.env.LIVEKIT_API_KEY;
  if (!key) throw new Error("LIVEKIT_API_KEY must be set");
  return key;
}

function getApiSecret(): string {
  const secret = process.env.LIVEKIT_API_SECRET;
  if (!secret) throw new Error("LIVEKIT_API_SECRET must be set");
  return secret;
}

export function getRoomServiceClient(): RoomServiceClient {
  if (!roomServiceClient) {
    roomServiceClient = new RoomServiceClient(getLivekitUrl(), getApiKey(), getApiSecret());
  }
  return roomServiceClient;
}

export function getSipClient(): SipClient {
  if (!sipClient) {
    sipClient = new SipClient(getLivekitUrl(), getApiKey(), getApiSecret());
  }
  return sipClient;
}

export async function createAccessToken(identity: string, roomName: string): Promise<string> {
  const at = new AccessToken(getApiKey(), getApiSecret(), {
    identity,
    ttl: "1h",
  });
  at.addGrant({ roomJoin: true, room: roomName });
  return await at.toJwt();
}

export async function createRoom(
  roomName: string,
  metadata?: string
): Promise<{ name: string; sid: string }> {
  const room = await getRoomServiceClient().createRoom({
    name: roomName,
    metadata,
    emptyTimeout: 300, // 5 minutes
  });
  return { name: room.name, sid: room.sid };
}
