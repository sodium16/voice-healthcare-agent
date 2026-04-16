# VAIDYA: Voice-First Healthcare Accessibility Agent

VAIDYA is a voice-first healthcare assistant prototype built for hackathon use cases where accessibility, speed, and clarity are critical. It helps users describe symptoms in natural language, receive simple actionable guidance, detect emergency signals, and personalize interactions using contextual memory.

## Problem Statement

Many people, especially elderly users, low-literacy users, and people with disabilities, struggle with traditional healthcare apps because of complex interfaces, language barriers, and delayed guidance during emergencies.

This project addresses that with a conversational, voice-oriented healthcare assistant focused on:

- Simplicity
- Accessibility
- Real-time support
- Action-oriented response

## Objective

Build a working prototype where a user can:

1. Speak a health-related concern
2. Receive clear and simple guidance (not a diagnosis)
3. Trigger emergency-aware behavior for critical situations
4. Benefit from context and preferences remembered over time

## Key Features

- Voice-first interaction flow (mic input in frontend, Vapi-compatible architecture)
- Emergency detection for high-risk phrases (chest pain, breathing difficulty, unconsciousness, etc.)
- AI guidance generation via Gemini with robust fallback responses
- Emotion state classification (`calm`, `concern`, `panic`)
- Contextual memory using Qdrant vector database
- Personalized memory retrieval (`language`, `preference`, interaction metadata)
- Location-aware request shape (`location` passed in `/ask` API)
- Offline/failure fallback using deterministic mock response library
- API-contract-based modular architecture

## Architecture

High-level flow:

User -> Voice/UI -> Backend API (`/ask`) -> AI + Emergency + Memory -> Response -> Voice/UI Output

Core components:

- Frontend: Voice UI, interaction display, emergency action controls, settings
- Backend (Node.js + Express): API orchestration, emergency engine, AI service routing
- AI Layer: Gemini for health guidance + emotion/action generation
- Memory Layer: Qdrant for storing and retrieving context/preferences
- Voice Layer: Vapi service wrapper (architecture-ready, partially stubbed)

## Tech Stack

- Frontend: HTML, CSS, Vanilla JavaScript
- Backend: Node.js, Express
- AI: Google Gemini (`@google/generative-ai`)
- Vector DB: Qdrant (`@qdrant/js-client-rest`)
- Voice Integration: Vapi (`@vapi-ai/web` + backend service wrapper)

## API Contract

### `POST /ask`

Request:

```json
{
	"user_id": "string",
	"query": "string",
	"location": "string"
}
```

Response:

```json
{
	"response": "string",
	"actions": ["string"],
	"emotion": "calm | concern | panic"
}
```

### `POST /memory`

Request:

```json
{
	"user_id": "string",
	"key": "string",
	"value": "string"
}
```

Response:

```json
{
	"message": "stored"
}
```

### `GET /memory/:user_id` or `GET /memory?user_id=...`

Response example:

```json
{
	"user_id": "user_123",
	"language": "hindi",
	"preference": "slow speech"
}
```

### Health Endpoints

- `GET /health` -> quick status
- `GET /health/full` -> backend + service diagnostics

## Requirement Coverage Matrix

| Hackathon Requirement | Implementation Status | Notes |
|---|---|---|
| Voice-first interaction | Partial | Frontend mic flow exists; backend Vapi service is scaffolded for deeper integration |
| Multilingual & low-literacy support | Partial | Language preference UI + simple-response prompting implemented; full multilingual generation can be extended |
| Healthcare guidance (not diagnosis) | Implemented | Gemini system prompt enforces non-diagnostic guidance |
| Emergency detection & urgent response | Implemented | Keyword-triggered panic mode and emergency action suggestions |
| Contextual memory (Qdrant) | Implemented | Stores/retrieves user context and interaction metadata |
| Location-aware responses | Partial | `location` passed in contract and persisted in interaction payload |
| Offline fallback support | Implemented (prototype) | Rule-based mock response fallback when AI unavailable |
| Emotion awareness | Implemented | `calm/concern/panic` classification and UI state updates |

## Project Structure

```text
voice-healthcare-agent/
	backend/
		src/
			routes/        # /ask, /memory, /health
			services/      # ai, emergency, gemini, qdrant, vapi
			config/        # environment, constants, logger
	frontend/
		index.html
		styles.css
		src/js/script.js # client interaction + API calls
	docs/
		api-contract.md
		architeture.md
```

## Local Setup

### Prerequisites

- Node.js 18+
- npm
- Docker (recommended for Qdrant)

### 1) Start Qdrant

```bash
docker run -p 6333:6333 qdrant/qdrant
```

### 2) Configure Backend Environment

Create `backend/.env`:

```env
PORT=3000
NODE_ENV=development

QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

GEMINI_API_KEY=your_gemini_key_here

VAPI_API_KEY=your_vapi_key_here
VAPI_PHONE_NUMBER_ID=

FRONTEND_URL=http://localhost:5000
LOG_LEVEL=info
```

### 3) Install Dependencies

From repo root:

```bash
npm install
```

From backend:

```bash
cd backend
npm install
```

### 4) Run Backend

```bash
cd backend
npm run dev
```

Backend runs on `http://localhost:3000`.

### 5) Run Frontend

Serve `frontend/` as static files using any local static server.

Example with Python:

```bash
cd frontend
python -m http.server 5000
```

Open `http://localhost:5000`.

## Demo Walkthrough

1. Open the frontend dashboard
2. Speak or type: "I have fever and headache"
3. Observe:
	 - AI guidance response
	 - Suggested actions
	 - Emotion status update (`concern`/`calm`)
4. Try emergency input: "I have chest pain and cannot breathe"
5. Observe panic mode and emergency-first instructions

## Safety Disclaimer

This project is a hackathon prototype and not a replacement for professional medical care.

- It does not provide medical diagnosis
- It should not be used as a sole medical decision system
- In emergencies, contact local emergency services immediately (e.g., 108 in India)

## Current Limitations

- Full end-to-end Vapi telephony/voice pipeline is not fully implemented in backend service methods yet
- Embeddings are currently mocked for Qdrant storage/search points in prototype mode
- Nearby hospital lookup is currently mocked/demo-oriented
- Advanced multilingual generation quality can be improved with dedicated language routing

## Future Improvements

- Complete production-grade Vapi integration (STT/TTS/call orchestration)
- Real embedding generation for semantic memory retrieval
- Real geolocation and hospital discovery integration
- Barge-in and interruption-aware live conversation loop
- Better offline package with local first-aid playbooks
- Clinical safety guardrails with stricter response validation

## Team Pitch Summary

VAIDYA demonstrates how a voice-first, emotion-aware, memory-enabled healthcare assistant can make digital care access more inclusive for real-world users who are often left behind by complex app interfaces.

It is designed to be practical, modular, and extensible for real deployment scenarios.
