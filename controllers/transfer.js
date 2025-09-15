import express from "express";
const router = express.Router();

import { createRoomIfNotExists, generateToken } from "../services/liveKitService.js";
import generateSummary  from "../services/llmService.js";
import { saveSummary, createTransfer, updateCall, getCall } from "../config/dynamoDb.js";
import { v4 as uuidv4 } from "uuid";

/**
 * POST /api/transfers/initiate
 * Body: { callId, agentAId, agentBId, transcriptText (optional), toAgentPhone (optional) }
 */
router.post("/initiate", async (req, res) => {
  try {
    const { callId, agentAId, agentBId, transcriptText, toAgentPhone } = req.body;

    if (!callId || !agentAId) {
      return res.status(400).json({ error: "callId and agentAId are required" });
    }

    // 1) create/obtain new LiveKit room for transfer
    const transferRoom = `transfer-${uuidv4()}`;
    await createRoomIfNotExists(transferRoom);

    // 2) Generate summary using transcript (either pulled from DB or provided)
    let transcriptSourceText = transcriptText;
    if (!transcriptSourceText) {
      // Attempt to pull brief context from the Calls table if present (non-blocking)
      try {
        const callItem = await getCall(callId);
        if (callItem && callItem.latestTranscript) {
          transcriptSourceText = callItem.latestTranscript;
        }
      } catch (e) {
        throw e;
      }
    }

    const summaryText = await generateSummary(transcriptSourceText || "No transcript provided");

    // 3) store summary in DynamoDB
    const savedSummary = await saveSummary({
      callId,
      summaryText,
      model: process.env.LLM_MODEL || "gpt-4o-mini",
      metadata: { generatedBy: "transfers.initate" },
    });

    // 4) create transfer record in DB
    const transferRecord = await createTransfer({
      callId,
      fromAgentId: agentAId,
      toAgentIdOrPhone: agentBId || toAgentPhone,
      transferRoom,
      summaryId: savedSummary.summaryId,
      extra: { transcriptHint: transcriptSourceText ? transcriptSourceText.slice(0, 200) : null },
    });

    // 5) update call status to 'transferring' (optional)
    await updateCall(callId, { status: "transferring", lastSummaryId: savedSummary.summaryId, transferId: transferRecord.transferId });

    // 6) generate LiveKit tokens for frontend participants (Agent A & Agent B)
    const tokenA = generateToken(transferRoom, agentAId);
    const tokenB = generateToken(transferRoom, agentBId || `agent-${uuidv4()}`);

    // 7) respond with necessary info
    return res.json({
      ok: true,
      transfer: {
        transferId: transferRecord.transferId,
        transferRoom: transferRecord.transferRoom,
        summaryId: savedSummary.summaryId,
      },
      tokens: { tokenA, tokenB },
      summaryText,
    });
  } catch (err) {
    console.error("transfers.initiate error:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
