import express from "express";
const router = express.Router();

import { createCall, getCall, updateCall, listCallsByAgent } from "../config/dynamoDb.js";

// POST /api/calls → create a call session
router.post("/", async (req, res) => {
  try {
    const { callerId, agentAId, metadata = {} } = req.body;
    const call = await createCall({ callerId, agentAId, metadata });
    return res.status(201).json({ ok: true, call });
  } catch (err) {
    console.error("calls.create", err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/calls/:callId → fetch a call
router.get("/:callId", async (req, res) => {
  try {
    const call = await getCall(req.params.callId);
    if (!call) return res.status(404).json({ error: "Not found" });
    return res.json({ ok: true, call });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/calls/:callId → update call
router.patch("/:callId", async (req, res) => {
  try {
    const updated = await updateCall(req.params.callId, req.body);
    return res.json({ ok: true, updated });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/calls/agent/:agentId → list calls by agent
router.get("/agent/:agentId", async (req, res) => {
  try {
    const calls = await listCallsByAgent(req.params.agentId);
    return res.json({ ok: true, calls });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
