import express from 'express'
import dotenv from 'dotenv'
import morgan from 'morgan'
import logger from './libs/logger.js'
import summariesRouter from "./controllers/agents.js";
import roomsRouter from "./controllers/rooms.js";
import transfersRouter from "./controllers/transfer.js";
import callsRouter from "./controllers/calls.js";
import transcriptsRouter from "./controllers/transcripts.js";
import agentsRouter from "./controllers/agents.js";


dotenv.config()

const app = express();
app.use(express.json());
app.use(morgan("dev"))

app.post("/token", async (req, res) => {
  try {
    const { roomName, identity, isModerator = false, ttlSeconds } = req.body;

    if (!roomName) {
      return res.status(400).json({ error: "roomName is required" });
    }

    // If client didn't provide an identity, create a short unique one.
    const finalIdentity = identity || `user_${Math.random().toString(36).slice(2, 9)}`;

    // Ensure room exists (idempotent)
    await createRoomIfNotExists(roomName);

    const token = generateToken(roomName, finalIdentity, {
      isModerator,
      ttlSeconds
    });

    return res.json({ token, roomName, identity: finalIdentity });
  } catch (err) {
    console.error("Error in /token:", err);
    return res.status(500).json({ error: "Failed to create token", details: err.message });
  }
});


app.use("/api/rooms", roomsRouter);
app.use("/api/summaries", summariesRouter);
app.use("/api/transfers", transfersRouter);
app.use("/api/calls", callsRouter);
app.use("/api/transcripts", transcriptsRouter);
app.use("/api/agents", agentsRouter);



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => logger.info(`Server listening on ${PORT}`));
