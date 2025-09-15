import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import dotenv from 'dotenv'
dotenv.config()

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET
const LIVEKIT_API_URL = process.env.LIVEKIT_API_URL

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_API_URL) {
  throw new Error(
    "Missing LiveKit environment variables. Make sure LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_API_URL are set."
  );
}

// RoomServiceClient expects an HTTP(S) URL (not ws/wss)
const roomService = new RoomServiceClient(
  LIVEKIT_API_URL,
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET
);

/**
 * Create a room if it doesn't exist.
 * Returns the room name on success.
 */
export async function createRoomIfNotExists(roomName) {
  if (!roomName) throw new Error("roomName is required");

  try {
    // getRoom throws if not found
    const room = await roomService.getRoom(roomName);
    return room.name;
  } catch (err) {
    // If the error indicates not found, create the room.
    // The server SDK will return a Twirp error; simplest approach: try to create.
    // (You may want more robust error checking in production.)
    const created = await roomService.createRoom({ name: roomName });
    return created.name;
  }
}

/**
 * Generate a JWT access token for a client to join a room.
 * - roomName: string
 * - identity: string (unique per participant)
 * - opts: { isModerator: boolean, ttlSeconds: number }
 */
export function generateToken(roomName, identity, opts = {}) {
  if (!roomName) throw new Error("roomName is required");
  if (!identity) throw new Error("identity is required");

  const { isModerator = false, ttlSeconds = 3600 } = opts;

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    // optional: set expiry (seconds from now)
    // some versions support at.setExpiration, but passing via grant is common
  });

  // Add room grant with permissions
  at.addGrant({
    roomJoin: true,
    room: roomName,
    // permissions:
    // canPublish / canSubscribe / canPublishData are true by default for typical usage,
    // but you can set them explicitly for stricter control.
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    ...(isModerator && { roomAdmin: true })
  });

  // Optionally set a TTL (by setting `exp` in the token)
  if (ttlSeconds) {
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
    at.setExpiration(expiresAt);
  }

  return at.toJwt();
}
