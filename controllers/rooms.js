import express from "express";
const router = express.Router();

import { createRoomRecord, getRoomRecord, updateRoomRecord } from "../config/dynamoDb.js";

// POST /api/rooms
router.post("/", async (req, res) => {
  try {
    const { roomName, ownerId, metadata } = req.body;
    const room = await createRoomRecord({ roomName, ownerId, metadata });
    return res.status(201).json({ ok: true, room });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/rooms/:id
router.get("/:id", async (req, res) => {
  try {
    const room = await getRoomRecord(req.params.id);
    if (!room) return res.status(404).json({ error: "Not found" });
    return res.json({ ok: true, room });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/rooms/:id
router.patch("/:id", async (req, res) => {
  try {
    const room = await updateRoomRecord(req.params.id, req.body);
    return res.json({ ok: true, room });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
