# WebRTC Signaling Server

A small WebSocket server for WebRTC signaling: create/join rooms and forward signal messages between two peers in a room.

## Run with Docker

From the `signal-server` directory:

```bash
docker compose up --build
```

The server listens on **port 8080**. Connect from your frontend to:

```
ws://localhost:8080
```

## Run without Docker

```bash
npm install
npm start
```

Default port is 8080. Override with `PORT`:

```bash
PORT=3000 npm start
```

---

## Message protocol (frontend integration)

All messages are **JSON** over the WebSocket.

### Client → Server

| Action       | Send                                                                 | Notes                                      |
| ------------ | -------------------------------------------------------------------- | ------------------------------------------ |
| Create room  | `{ "type": "create", "roomId"?: "<id>" }`                            | Omit `roomId` to get a server-generated id. |
| Join room    | `{ "type": "join", "roomId": "<id>" }`                               | Required.                                  |
| Send signal  | `{ "type": "signal", "data": <any> }`                                | Forwarded to the other peer in the room.   |
| Leave room   | `{ "type": "leave" }`                                                | Optional; disconnect also leaves the room. |

### Server → Client

| Type          | Payload                          | When |
| ------------- | --------------------------------- | ---- |
| `created`     | `{ "type": "created", "roomId": "<id>" }` | After you create a room. |
| `joined`      | `{ "type": "joined", "roomId": "<id>" }`   | After you join a room. |
| `peer_joined` | `{ "type": "peer_joined" }`                | You are peer A and someone joined. |
| `signal`      | `{ "type": "signal", "data": <any> }`     | Other peer sent a signal; use `data` for SDP/candidates. |
| `peer_left`   | `{ "type": "peer_left" }`                 | The other peer left or disconnected. |
| `error`       | `{ "type": "error", "message": "<string>" }` | Invalid request, room not found, room full, etc. |

### Flow

1. **Peer A** sends `create` (optional `roomId`) → receives `created` with `roomId`.
2. **Peer B** sends `join` with that `roomId` → receives `joined`; **Peer A** receives `peer_joined`.
3. Either peer sends `signal` with `data` (e.g. SDP offer/answer or ICE candidate) → the other receives `signal` with the same `data`.
4. When one peer disconnects or sends `leave`, the other receives `peer_left` and the room is removed.
