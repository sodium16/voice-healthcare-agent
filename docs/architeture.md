# Architecture

Flow:
User → Voice (Vapi) → Backend (/ask) → Response → Voice Output

Components:
- Frontend (UI)
- Backend (Node.js)
- Voice (Vapi)
- Memory (Qdrant)

Rules:
- All communication via API
- No direct dependency between frontend/voice/backend
- Follow API contract strictly
