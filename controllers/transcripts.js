import express from "express";
const router = express.Router();

import { saveTranscript, getTranscript, listTranscriptsByCall } from "../config/dynamoDb.js";

// POST /api/transcripts
router.post("/", async (req, res) => {
  try {
    const { callId, text, source, metadata } = req.body;
    const transcript = await saveTranscript({ callId, text, source, metadata });
    return res.status(201).json({ ok: true, transcript });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/transcripts/:id
router.get("/:id", async (req, res) => {
  try {
    const transcript = await getTranscript(req.params.id);
    if (!transcript) return res.status(404).json({ error: "Not found" });
    return res.json({ ok: true, transcript });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/transcripts/call/:callId
router.get("/call/:callId", async (req, res) => {
  try {
    const transcripts = await listTranscriptsByCall(req.params.callId);
    return res.json({ ok: true, transcripts });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
