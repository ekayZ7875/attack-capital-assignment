import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

const REGION = process.env.AWS_REGION || "us-east-1";
const CALLS_TABLE = process.env.DYNAMODB_TABLE_CALLS || "Calls";
const SUMMARIES_TABLE = process.env.DYNAMODB_TABLE_SUMMARIES || "Summaries";
const TRANSFERS_TABLE = process.env.DYNAMODB_TABLE_TRANSFERS || "Transfers";

const rawClient = new DynamoDBClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(rawClient);

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

export async function updateCall(callId, updates = {}) {
  // Build an UpdateExpression for provided fields
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

export async function getCall(callId) {
  const result = await ddb.send(
    new GetCommand({
      TableName: CALLS_TABLE,
      Key: { callId },
    })
  );
  return result.Item;
}
