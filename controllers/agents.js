import express from "express";
const router = express.Router();

import { createAgent, getAgent, updateAgent, listAgents } from "../config/dynamoDb.js";

// POST /api/agents
router.post("/", async (req, res) => {
  try {
    const { name, phoneNumber, metadata } = req.body;
    const agent = await createAgent({ name, phoneNumber, metadata });
    return res.status(201).json({ ok: true, agent });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/agents/:id
router.get("/:id", async (req, res) => {
  try {
    const agent = await getAgent(req.params.id);
    if (!agent) return res.status(404).json({ error: "Not found" });
    return res.json({ ok: true, agent });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/agents/:id
router.patch("/:id", async (req, res) => {
  try {
    const agent = await updateAgent(req.params.id, req.body);
    return res.json({ ok: true, agent });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/agents
router.get("/", async (req, res) => {
  try {
    const agents = await listAgents();
    return res.json({ ok: true, agents });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
