import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

const REGION = process.env.AWS_REGION || "us-east-1";

const CALLS_TABLE = process.env.DYNAMODB_TABLE_CALLS || "Calls";
const SUMMARIES_TABLE = process.env.DYNAMODB_TABLE_SUMMARIES || "Summaries";
const TRANSFERS_TABLE = process.env.DYNAMODB_TABLE_TRANSFERS || "Transfers";
const TRANSCRIPTS_TABLE = process.env.DYNAMODB_TABLE_TRANSCRIPTS || "Transcripts";
const AGENTS_TABLE = process.env.DYNAMODB_TABLE_AGENTS || "Agents";
const ROOMS_TABLE = process.env.DYNAMODB_TABLE_ROOMS || "Rooms";

const rawClient = new DynamoDBClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(rawClient);

/* ---------------------------
   Summaries (existing)
   --------------------------- */
export async function saveSummary({
  callId,
  summaryText,
  model = "gpt-4o-mini",
  metadata = {},
}) {
  const summaryId = `sum-${uuidv4()}`;
  const now = new Date().toISOString();

  const item = {
    summaryId,
    callId,
    createdAt: now,
    model,
    summaryText,
    metadata,
  };

  await ddb.send(
    new PutCommand({
      TableName: SUMMARIES_TABLE,
      Item: item,
    })
  );

  return item;
}

export async function getSummary(summaryId) {
  const result = await ddb.send(
    new GetCommand({
      TableName: SUMMARIES_TABLE,
      Key: { summaryId },
    })
  );
  return result.Item;
}

export async function listSummariesByCall(callId, limit = 20) {
  // Requires a GSI on callId (callId-index) for efficient querying
  const params = {
    TableName: SUMMARIES_TABLE,
    IndexName: "callId-index",
    KeyConditionExpression: "callId = :cid",
    ExpressionAttributeValues: { ":cid": callId },
    ScanIndexForward: false,
    Limit: limit,
  };

  const result = await ddb.send(new QueryCommand(params));
  return result.Items || [];
}

/* ---------------------------
   Transfers (existing)
   --------------------------- */
export async function createTransfer({
  callId,
  fromAgentId,
  toAgentIdOrPhone,
  transferRoom,
  summaryId,
  extra = {},
}) {
  const transferId = `xfer-${uuidv4()}`;
  const now = new Date().toISOString();

  const item = {
    transferId,
    callId,
    fromAgentId: fromAgentId || null,
    toAgent: toAgentIdOrPhone || null,
    transferRoom: transferRoom || null,
    summaryId: summaryId || null,
    status: "initiated",
    createdAt: now,
    ...extra,
  };

  await ddb.send(
    new PutCommand({
      TableName: TRANSFERS_TABLE,
      Item: item,
    })
  );

  return item;
}

/* ---------------------------
   Calls
   --------------------------- */
export async function createCall({ callerId = null, agentAId = null, metadata = {} }) {
  const callId = `call-${uuidv4()}`;
  const now = new Date().toISOString();

  const item = {
    callId,
    callerId,
    agentAId,
    status: "active",
    createdAt: now,
    metadata,
  };

  await ddb.send(new PutCommand({ TableName: CALLS_TABLE, Item: item }));
  return item;
}

export async function getCall(callId) {
  const result = await ddb.send(new GetCommand({ TableName: CALLS_TABLE, Key: { callId } }));
  return result.Item;
}

export async function listCallsByAgent(agentAId, limit = 50) {
  // For production create a GSI: agentAId-index (partition: agentAId, sort: createdAt)
  const params = {
    TableName: CALLS_TABLE,
    IndexName: "agentAId-index",
    KeyConditionExpression: "agentAId = :aid",
    ExpressionAttributeValues: { ":aid": agentAId },
    ScanIndexForward: false,
    Limit: limit,
  };

  const result = await ddb.send(new QueryCommand(params));
  return result.Items || [];
}

export async function updateCall(callId, updates = {}) {
  const keys = Object.keys(updates);
  if (keys.length === 0) {
    throw new Error("No updates provided");
  }

  const ExpressionAttributeNames = {};
  const ExpressionAttributeValues = {};
  const setParts = [];

  keys.forEach((k, i) => {
    const nameKey = `#k${i}`;
    const valKey = `:v${i}`;
    ExpressionAttributeNames[nameKey] = k;
    ExpressionAttributeValues[valKey] = updates[k];
    setParts.push(`${nameKey} = ${valKey}`);
  });

  const params = {
    TableName: CALLS_TABLE,
    Key: { callId },
    UpdateExpression: `SET ${setParts.join(", ")}`,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ReturnValues: "ALL_NEW",
  };

  const result = await ddb.send(new UpdateCommand(params));
  return result.Attributes;
}

/* ---------------------------
   Transcripts
   --------------------------- */
export async function saveTranscript({ callId, text, source = "manual", metadata = {} }) {
  if (!callId || !text) throw new Error("callId and text are required for transcript");
  const transcriptId = `tx-${uuidv4()}`;
  const now = new Date().toISOString();

  const item = {
    transcriptId,
    callId,
    createdAt: now,
    text,
    source,
    metadata,
  };

  await ddb.send(new PutCommand({ TableName: TRANSCRIPTS_TABLE, Item: item }));
  return item;
}

export async function getTranscript(transcriptId) {
  const result = await ddb.send(new GetCommand({ TableName: TRANSCRIPTS_TABLE, Key: { transcriptId } }));
  return result.Item;
}

export async function listTranscriptsByCall(callId, limit = 50) {
  // For production create a GSI: callId-index on Transcripts table
  const params = {
    TableName: TRANSCRIPTS_TABLE,
    IndexName: "callId-index",
    KeyConditionExpression: "callId = :cid",
    ExpressionAttributeValues: { ":cid": callId },
    ScanIndexForward: false,
    Limit: limit,
  };

  const result = await ddb.send(new QueryCommand(params));
  return result.Items || [];
}

/* ---------------------------
   Agents
   --------------------------- */
export async function createAgent({ name, phoneNumber = null, metadata = {} }) {
  if (!name) throw new Error("name required to create agent");
  const agentId = `agent-${uuidv4()}`;
  const now = new Date().toISOString();

  const item = {
    agentId,
    name,
    phoneNumber,
    active: true,
    createdAt: now,
    metadata,
  };

  await ddb.send(new PutCommand({ TableName: AGENTS_TABLE, Item: item }));
  return item;
}

export async function getAgent(agentId) {
  const result = await ddb.send(new GetCommand({ TableName: AGENTS_TABLE, Key: { agentId } }));
  return result.Item;
}

export async function updateAgent(agentId, updates = {}) {
  const keys = Object.keys(updates);
  if (keys.length === 0) throw new Error("No updates provided");

  const ExpressionAttributeNames = {};
  const ExpressionAttributeValues = {};
  const setParts = [];

  keys.forEach((k, i) => {
    ExpressionAttributeNames[`#k${i}`] = k;
    ExpressionAttributeValues[`:v${i}`] = updates[k];
    setParts.push(`#k${i} = :v${i}`);
  });

  const params = {
    TableName: AGENTS_TABLE,
    Key: { agentId },
    UpdateExpression: `SET ${setParts.join(", ")}`,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ReturnValues: "ALL_NEW",
  };

  const result = await ddb.send(new UpdateCommand(params));
  return result.Attributes;
}

export async function listAgents(filter = { active: true }, limit = 100) {
  // Simple Scan for demo. For production use proper GSIs and Query.
  const expressionParts = [];
  const expressionValues = {};

  if (filter && filter.active !== undefined) {
    expressionParts.push("active = :active");
    expressionValues[":active"] = filter.active;
  }

  const params = {
    TableName: AGENTS_TABLE,
    Limit: limit,
  };

  if (expressionParts.length) {
    params.FilterExpression = expressionParts.join(" AND ");
    params.ExpressionAttributeValues = expressionValues;
  }

  const result = await ddb.send(new ScanCommand(params));
  return result.Items || [];
}

/* ---------------------------
   Rooms
   --------------------------- */
export async function createRoomRecord({ roomName = null, ownerId = null, metadata = {} }) {
  const roomId = `room-${uuidv4()}`;
  const now = new Date().toISOString();

  const item = {
    roomId,
    roomName: roomName || roomId,
    ownerId,
    createdAt: now,
    metadata,
    status: "ready",
  };

  await ddb.send(new PutCommand({ TableName: ROOMS_TABLE, Item: item }));
  return item;
}

export async function getRoomRecord(roomId) {
  const result = await ddb.send(new GetCommand({ TableName: ROOMS_TABLE, Key: { roomId } }));
  return result.Item;
}

export async function updateRoomRecord(roomId, updates = {}) {
  const keys = Object.keys(updates);
  if (keys.length === 0) throw new Error("No updates provided");

  const ExpressionAttributeNames = {};
  const ExpressionAttributeValues = {};
  const setParts = [];

  keys.forEach((k, i) => {
    ExpressionAttributeNames[`#k${i}`] = k;
    ExpressionAttributeValues[`:v${i}`] = updates[k];
    setParts.push(`#k${i} = :v${i}`);
  });

  const params = {
    TableName: ROOMS_TABLE,
    Key: { roomId },
    UpdateExpression: `SET ${setParts.join(", ")}`,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ReturnValues: "ALL_NEW",
  };

  const result = await ddb.send(new UpdateCommand(params));
  return result.Attributes;
}


/* Notes:
   - For query helpers that depend on GSIs (agentAId-index, callId-index), create those GSIs in your DynamoDB table definitions.
   - For quick local testing you can replace QueryCommand with ScanCommand, but Scans are slow on large tables.
   - All functions throw errors — callers should catch and handle them.
*/

