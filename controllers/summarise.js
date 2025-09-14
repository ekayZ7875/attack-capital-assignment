import express from "express";
const router = express.Router();

import { saveSummary, getSummary, listSummariesByCall } from "../config/dynamoDb.js";

// POST /api/summaries
router.post("/", async (req, res) => {
  try {
    const { callId, summaryText, model, metadata } = req.body;
    const summary = await saveSummary({ callId, summaryText, model, metadata });
    return res.status(201).json({ ok: true, summary });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/summaries/:id
router.get("/:id", async (req, res) => {
  try {
    const summary = await getSummary(req.params.id);
    if (!summary) return res.status(404).json({ error: "Not found" });
    return res.json({ ok: true, summary });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/summaries/call/:callId
router.get("/call/:callId", async (req, res) => {
  try {
    const summaries = await listSummariesByCall(req.params.callId);
    return res.json({ ok: true, summaries });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
