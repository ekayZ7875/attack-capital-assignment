import{ LivekitServer }  from ('livekit-server-sdk'); // check actual package name
import { AccessToken } from ('livekit-server-sdk'); // token creation
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_API_URL;

const livekit = new LivekitServer(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

async function createRoomIfNotExists(roomName) {
  // LiveKit manages rooms implicitly; some deployments require explicit creation.
  // This shows the idea; actual SDK might differ.
  await livekit.createRoom(roomName);
  return roomName;
}

function generateToken(roomName, identity, isModerator = false) {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
  });

  at.addGrant({ room: roomName });
  
  return at.toJwt();
}

module.exports = { createRoomIfNotExists, generateToken };
