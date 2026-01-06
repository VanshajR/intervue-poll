# 📊 Intervue Poll

> Real-time teacher/student polling system with server-authoritative timers, single-vote enforcement, comprehensive poll history, integrated chat, and built-in resilience against database outages.

---

## ✨ Features

### 👨‍🏫 Teacher Features
- Create timed polls (5–60s) with ≥2 options ([server/src/sockets/index.js](server/src/sockets/index.js), [server/src/services/pollService.js](server/src/services/pollService.js)).
- One active poll; new poll only if none active or all students answered (uses `countVotesForPoll`).
- Live results and server-driven timer ticks ([server/src/services/timerService.js](server/src/services/timerService.js)).
- History from Mongo ([server/src/controllers/pollController.js](server/src/controllers/pollController.js) → [server/src/services/pollService.js](server/src/services/pollService.js)); rendered in [client/src/App.jsx](client/src/App.jsx) and [client/src/components/PollCard.jsx](client/src/components/PollCard.jsx).
- Kick participants (`teacher:kick` in [server/src/sockets/index.js](server/src/sockets/index.js)).
- Teacher lockout when another teacher is active; demo password is client-side only (`admin`, see [client/src/App.jsx](client/src/App.jsx)).

### 🎓 Student Features
- Per-tab name onboarding (sessionStorage) in [client/src/App.jsx](client/src/App.jsx).
- Receive questions instantly; late join shows remaining time from server (`remainingSeconds` in [client/src/hooks/usePollState.js](client/src/hooks/usePollState.js)).
- Vote once per poll; enforced via unique index ([server/src/models/Vote.js](server/src/models/Vote.js)) and checks in [server/src/services/voteService.js](server/src/services/voteService.js).
- Results visible after submit or expiry (events handled in [client/src/hooks/usePollState.js](client/src/hooks/usePollState.js)).

### 🛡️ System Resilience
- State recovery on refresh/reconnect via `request:state`/`poll:state` ([client/src/hooks/usePollState.js](client/src/hooks/usePollState.js), [server/src/services/pollService.js](server/src/services/pollService.js)).
- Server is timer source of truth (ticks in [server/src/services/timerService.js](server/src/services/timerService.js)).
- DB outage handling: retry/backoff and `dbReady` guard ([server/src/server.js](server/src/server.js)); 503 API fallback ([server/src/app.js](server/src/app.js)); socket acks return "Database unavailable" ([server/src/sockets/index.js](server/src/sockets/index.js)).
- Session de-dup: per-tab sessionId + `upsertSession` ([server/src/services/sessionService.js](server/src/services/sessionService.js)) avoid duplicate participants across reconnects/restarts.

### 💬 Chat & Participants
- Chat via sockets (not persisted) in [server/src/sockets/index.js](server/src/sockets/index.js); UI in [client/src/components/ChatPanel.jsx](client/src/components/ChatPanel.jsx) with outside-click close and fullscreen toggle; FAB hides in fullscreen and returns on close.
- Participant roster live via `sessions:update`; teacher can kick (blocked on reconnect).

## 🏗️ Architecture

### Frontend (Vite + React)
- Hooks: [client/src/hooks/useSocket.js](client/src/hooks/useSocket.js), [client/src/hooks/usePollState.js](client/src/hooks/usePollState.js), [client/src/hooks/usePollTimer.js](client/src/hooks/usePollTimer.js).
- Components: [client/src/App.jsx](client/src/App.jsx), [client/src/components/PollCard.jsx](client/src/components/PollCard.jsx), [client/src/components/ChatPanel.jsx](client/src/components/ChatPanel.jsx).
- Styling: [client/src/styles.css](client/src/styles.css).

### Backend (Express + Socket.io + MongoDB)
- Entry/boot: [server/src/server.js](server/src/server.js) (DB retry/backoff, socket setup), [server/src/app.js](server/src/app.js) (API, CORS/helmet, 503 guard).
- Sockets: [server/src/sockets/index.js](server/src/sockets/index.js).
- Services: [server/src/services/pollService.js](server/src/services/pollService.js), [server/src/services/voteService.js](server/src/services/voteService.js), [server/src/services/sessionService.js](server/src/services/sessionService.js), [server/src/services/timerService.js](server/src/services/timerService.js).
- HTTP: [server/src/routes/pollRoutes.js](server/src/routes/pollRoutes.js), [server/src/controllers/pollController.js](server/src/controllers/pollController.js).
- Models: [server/src/models/Poll.js](server/src/models/Poll.js), [server/src/models/Vote.js](server/src/models/Vote.js), [server/src/models/Session.js](server/src/models/Session.js).

## 📦 Data Model
- Poll: question, options[{ text, isCorrect, votes }], durationSeconds (5–60), status, startTime, expiresAt, completedAt.
- Vote: pollId, optionId, sessionId, voterName; unique (pollId, sessionId) enforces one vote per student per poll.
- Session: sessionId, name, role, isKicked, isOnline, lastSeen.

## 🔄 Key Flows
- Session init: client emits `session:init`; server returns current poll state (or kicked/block), broadcasts participants.
- Create poll: validates payload/gating, creates poll, starts server timer, emits `poll:created` with remaining seconds.
- Vote: validates session, poll active, option exists, time remaining; dedup via unique index; emits `poll:update` after increment.
- Timer: server ticks `poll:timer` every second; on expiry, marks poll completed and emits `poll:ended`.
- Reconnect/reload: client calls `request:state` to get authoritative poll/vote/timer state.
- Kick: teacher emits `teacher:kick`; target marked kicked and notified; roster updates.
- Chat: broadcast only (not stored).

## 🚀 Setup

**Prerequisites:** Node 18+, MongoDB

### Backend
1) `cd server && npm install`
2) Copy `server/.env.example` → `server/.env`
   - Set `MONGO_URI` (MongoDB connection string)
   - Set `CLIENT_ORIGIN` (comma-separated frontend origins or `*` for local dev)
   - Optional: `PORT`, `DB_RETRY_MS` (default 5000ms)
3) Run: `npm start` (or `npm run dev` if present).

### Frontend
1) `cd client && npm install`
2) If backend URL ≠ `http://localhost:4000`, set `VITE_SOCKET_URL` in `client/.env`.
3) Run: `npm run dev` (Vite, usually `http://localhost:5173`).

## ✅ Verification Checklist

- ✔️ **Poll creation:** Teacher creates 5–60s poll; students see instantly; late joiners see remaining time
- ✔️ **Single active poll:** New poll blocked while one is active until all students answer or timer expires
- ✔️ **Voting:** Each student votes once; duplicates rejected; live results update; visible after submit/expiry
- ✔️ **State recovery:** Refresh maintains question, vote status, and remaining timer
- ✔️ **History:** Completed polls from MongoDB displayed with options and percentages
- ✔️ **Chat:** FAB toggle, outside-click close, fullscreen mode; participant kick blocks reconnect
- ✔️ **Resilience:** Mongo outage returns 503/error acks; server stays up; auto-reconnects when DB restored

## 🚀 Deployment

### Backend (Recommended: Render)
- Set env: `MONGO_URI`, `CLIENT_ORIGIN`, optional `PORT`, `DB_RETRY_MS`
- Requires WebSocket support
- CORS must include frontend origin

### Frontend (Recommended: Netlify)
- Build: `npm run build` (outputs to `dist`)
- Set `VITE_SOCKET_URL` to backend origin
- Deploy static files

