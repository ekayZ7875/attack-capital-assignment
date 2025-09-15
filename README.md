# 📞 Real-Time Call Management System

This project is a **real-time call management system** built with **Node.js**, **Express**, **LiveKit**, **DynamoDB**, and **OpenAI LLM**.  
It enables customer support workflows such as:

- Caller connects with Agent A in a LiveKit room.
- Transcripts are stored in DynamoDB.
- Summaries are generated using OpenAI.
- Agent A can initiate a **warm transfer** to Agent B:
  - A new transfer room is created.
  - Summary of the conversation is provided to Agent B.
  - Caller continues with Agent B.

---

## 🚀 Features
- Real-time audio/video via **LiveKit**.
- **DynamoDB** as the database (Calls, Transcripts, Summaries, Transfers, Agents, Rooms).
- **LLM integration** for concise call summaries.
- Warm transfer between agents (Agent A ➝ Agent B).
- REST APIs for calls, transcripts, transfers, summaries, agents, and rooms.

---

## 🏗️ Architecture

- **Backend (Node.js + Express)**  
  Provides REST APIs, generates LiveKit tokens, stores data in DynamoDB, and integrates with OpenAI.

- **Database (DynamoDB)**  
  Stores call sessions, transcripts, summaries, transfers, agents, and rooms.

- **LLM (OpenAI)**  
  Summarizes call transcripts into short, actionable context.

---

## 🗂️ Database Schema

### Calls
| Field | Type | Notes |
|-------|------|-------|
| callId (PK) | string | `call-uuid` |
| callerId | string | optional |
| agentAId | string | initial agent |
| agentBId | string | after transfer |
| status | string | `active | transferring | ended` |
| createdAt | string | ISO timestamp |
| endAt | string | ISO timestamp |
| lastSummaryId | string | FK → Summaries |

### Transcripts
| Field | Type | Notes |
|-------|------|-------|
| transcriptId (PK) | string | `tx-uuid` |
| callId | string | FK |
| text | string | transcript chunk |
| source | string | `manual | whisper` |
| createdAt | string | ISO timestamp |

### Summaries
| Field | Type | Notes |
|-------|------|-------|
| summaryId (PK) | string | `sum-uuid` |
| callId | string | FK |
| summaryText | string | generated summary |
| model | string | LLM model used |
| createdAt | string | ISO timestamp |

### Transfers
| Field | Type | Notes |
|-------|------|-------|
| transferId (PK) | string | `xfer-uuid` |
| callId | string | FK |
| fromAgentId | string | initiator |
| toAgentId | string | recipient |
| transferRoom | string | LiveKit room |
| summaryId | string | FK |
| status | string | `initiated | completed | failed` |
| createdAt | string | ISO timestamp |

### Agents
| Field | Type | Notes |
|-------|------|-------|
| agentId (PK) | string | `agent-uuid` |
| name | string | |
| active | boolean | |
| createdAt | string | ISO timestamp |

### Rooms
| Field | Type | Notes |
|-------|------|-------|
| roomId (PK) | string | `room-uuid` |
| roomName | string | |
| ownerId | string | |
| status | string | |
| createdAt | string | ISO timestamp |

---

## 🔌 API Endpoints

### Calls
- `POST /api/calls` → create a call
- `GET /api/calls/:callId` → fetch a call
- `PATCH /api/calls/:callId` → update call
- `GET /api/calls/agent/:agentId` → list calls by agent

### Transcripts
- `POST /api/transcripts` → save transcript
- `GET /api/transcripts/:id` → get transcript
- `GET /api/transcripts/call/:callId` → list transcripts for call

### Summaries
- `POST /api/summaries` → save summary
- `GET /api/summaries/:id` → get summary
- `GET /api/summaries/call/:callId` → list summaries for call

### Transfers
- `POST /api/transfers/initiate`  
  - Body: `{ callId, agentAId, agentBId, transcriptText? }`  
  - Response: `{ transferId, transferRoom, tokens, summaryText }`

### Rooms
- `POST /api/rooms` → create room
- `GET /api/rooms/:id` → get room
- `PATCH /api/rooms/:id` → update room

### Agents
- `POST /api/agents` → register agent
- `GET /api/agents/:id` → get agent
- `PATCH /api/agents/:id` → update agent
- `GET /api/agents` → list active agents

---

## 🔑 Environment Variables

Create a `.env` file:

```env
PORT=3000
AWS_REGION=us-east-1

DYNAMODB_TABLE_CALLS=Calls
DYNAMODB_TABLE_TRANSCRIPTS=Transcripts
DYNAMODB_TABLE_SUMMARIES=Summaries
DYNAMODB_TABLE_TRANSFERS=Transfers
DYNAMODB_TABLE_AGENTS=Agents
DYNAMODB_TABLE_ROOMS=Rooms

LIVEKIT_API_KEY=your_livekit_key
LIVEKIT_API_SECRET=your_livekit_secret
LIVEKIT_API_URL=https://your-livekit-host

OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini
```

## Running The Project 

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.js
```

This project was created using `bun init` in bun v1.1.42. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.


## Project Flow

  participant Caller
  participant AgentA
  participant Backend
  participant DynamoDB
  participant LiveKit
  participant AgentB

  Caller->>Backend: POST /api/calls
  Backend->>DynamoDB: store Call
  Backend->>LiveKit: create/join room
  AgentA->>LiveKit: join room
  Caller->>LiveKit: join room

  Note over Caller,AgentA: Active call

  AgentA->>Backend: POST /api/transcripts
  Backend->>DynamoDB: store transcript
  Backend->>OpenAI: generate summary
  Backend->>DynamoDB: store summary

  AgentA->>Backend: POST /api/transfers/initiate
  Backend->>LiveKit: create transfer room
  Backend->>OpenAI: generate summary
  Backend->>DynamoDB: save transfer
  Backend-->>AgentA: tokenA
  Backend-->>AgentB: tokenB

  AgentA->>LiveKit: join transfer room
  AgentB->>LiveKit: join transfer room
  Note over AgentA,AgentB: Warm handover

  Caller->>LiveKit: move to transfer room
  AgentA->>LiveKit: leave
  Note over Caller,AgentB: Call continues with AgentB
