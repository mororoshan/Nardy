# Agent spec: WebRTC signaling server (Node.js + Docker)

Use this document as the full prompt/spec for an agent to implement a **WebSocket signaling server** for WebRTC. The server relays SDP offers/answers and ICE candidates between two peers in a "room" so they can establish a direct peer-to-peer connection. Target: run locally on the user's PC via Docker.

---

## Goal

Build a **minimal WebSocket signaling server** that:

1. Lets a peer **create a room** and get a **room ID** (short code, e.g. 6 alphanumeric characters).
2. Lets another peer **join a room** by that room ID.
3. **Forwards signaling messages** (SDP and ICE) between the two peers in the same room. The server does not interpret or store game data—only relays JSON messages.

No game logic, no persistence. Server is stateless except for in-memory room state (room ID → set of WebSocket connections).

---

## Protocol (client ↔ server)

All messages are **JSON** over the WebSocket.

### Client → Server

- **Create room**  
  `{ "type": "create" }`  
  Server creates a new room, generates a unique room ID, adds this client to the room, and replies with the room ID.

- **Join room**  
  `{ "type": "join", "roomId": "<room-id>" }`  
  Server adds this client to the existing room. If the room has exactly one other peer, server can optionally send a "peer_joined" to the creator so the UI can show "Peer connected."

- **Signal (forward to other peer(s) in the same room)**  
  `{ "type": "signal", "payload": <any JSON> }`  
  Server forwards `payload` to every **other** client in the same room. Typical payloads are SDP offer/answer or ICE candidate (opaque to the server).

### Server → Client

- **Room created**  
  `{ "type": "room_created", "roomId": "<room-id>" }`  
  Sent after client sends `create`.

- **Room joined**  
  `{ "type": "room_joined", "roomId": "<room-id>" }`  
  Sent after client sends `join` and the room exists.

- **Error**  
  `{ "type": "error", "message": "<string>" }`  
  e.g. room not found, room full, invalid message.

- **Signal from peer**  
  `{ "type": "signal", "payload": <any JSON> }`  
  Same shape as client’s signal; server echoes the payload from the other peer. Clients use this to receive SDP/ICE from the remote peer.

### Room rules

- A room is created by the first `create`. Room ID is unique (e.g. 6-character alphanumeric).
- Max **2** clients per room (one creator, one joiner). If a third tries to join, reply with `error` and do not add them.
- When a client disconnects, remove them from the room. If the room becomes empty, the room can be deleted (optional). If one peer leaves, the other can receive a "peer_left" event (optional but useful for UI).

---

## Tech and structure

- **Runtime:** Node.js (LTS, e.g. 20 or 22).
- **WebSocket library:** `ws` (https://www.npmjs.com/package/ws). Use plain `ws`; no need for Socket.io.
- **No framework required:** A single entry file (e.g. `server.js` or `src/index.ts`) that starts an HTTP server and attaches a WebSocket server to it is enough.
- **Optional:** TypeScript in a `src/` folder with a build step; if so, Docker should run the compiled JS or use `ts-node`/`tsx` for simplicity.

Suggested layout:

```
signal-server/
  Dockerfile
  docker-compose.yml   # optional, for one-command run
  package.json
  server.js            # or src/index.ts
  README.md            # how to run with Docker and without
```

---

## Docker requirements

1. **Dockerfile**
   - Base image: `node:20-alpine` (or similar).
   - Copy `package.json` (and lockfile if present), run `npm ci --omit=dev`.
   - Copy application code.
   - Expose one port (e.g. **8080**).
   - Start command: `node server.js` (or `node dist/index.js` if built).
   - No root if possible (create a non-root user and run as that user).

2. **docker-compose.yml** (optional but recommended)
   - One service (e.g. `signal-server`).
   - Build from the Dockerfile in the current directory (or `./signal-server` if the spec lives in a subfolder).
   - Map host port **8080** to container port 8080.
   - No env vars required for minimal version; optional: `PORT` or `WS_PORT` to override port inside the container.

3. **Run on PC**
   - User should be able to run:
     - `docker compose up --build`
     - or `docker build -t signal-server . && docker run -p 8080:8080 signal-server`
   - Server listens on `0.0.0.0` inside the container so it’s reachable from the host. From the browser (e.g. Nardi app), connection URL will be `ws://localhost:8080` when testing on the same machine.

---

## Server behavior summary

- Listen on **HTTP** (e.g. port 8080); attach **WebSocket server** to the same HTTP server (or on same port via upgrade).
- On WebSocket connection: wait for first message. Expect `{ type: "create" }` or `{ type: "join", roomId: "..." }`. Associate the socket with a room.
- On `signal`: broadcast `payload` to all other sockets in the same room.
- On socket close/error: remove socket from room; optionally notify the other peer with `{ type: "peer_left" }`.
- Validate JSON and `type`; reply `{ type: "error", message: "..." }` for unknown type, missing roomId, or room full.

---

## Acceptance criteria

1. **Create room:** Client sends `{ type: "create" }` → receives `{ type: "room_created", roomId: "ABC123" }` (or similar).
2. **Join room:** Second client sends `{ type: "join", roomId: "ABC123" }` → receives `{ type: "room_joined", roomId: "ABC123" }`.
3. **Relay signal:** Client A sends `{ type: "signal", payload: { foo: "offer", sdp: "..." } }` → Client B receives `{ type: "signal", payload: { foo: "offer", sdp: "..." } }` (and vice versa). No other client in another room receives it.
4. **Docker:** `docker compose up --build` (or equivalent) starts the server; from the host, `ws://localhost:8080` accepts WebSocket connections.
5. **Room full:** Third client joining the same room gets an error and is not added.

---

## Optional extras (if time permits)

- **Health check:** GET `/health` or `/` returning 200 so Docker/orchestration can check liveness.
- **CORS:** Not needed for WebSocket from a browser (no CORS for WS), but if you add an HTTP endpoint, allow origin for local dev (e.g. `http://localhost:5173` for Vite).
- **peer_left:** When one of two peers disconnects, send `{ type: "peer_left" }` to the other so the Nardi app can show "Opponent disconnected."

---

## Out of scope

- No database or file storage.
- No authentication or API keys.
- No HTTPS/WSS in this spec (local PC only; user can add reverse proxy later for production).
- No game-specific logic; only generic signaling relay.

---

## Deliverables

1. Working Node.js WebSocket server implementing the protocol above.
2. `Dockerfile` and optional `docker-compose.yml` to run it on the user’s PC.
3. Short `README.md` in the server folder: how to run with Docker, how to run without Docker (`npm install`, `node server.js`), and the message protocol summary so the frontend (Nardi app) can integrate later.
