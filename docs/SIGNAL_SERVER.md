# WebRTC Signaling Server

A small WebSocket server for WebRTC signaling: create/join rooms and forward signal messages between two peers in a room.

## Run with Docker

From the `signal-server` directory:

```bash
docker compose up --build
```

The server listens on **port 8080**. By default the Compose setup uses **WSS** (`USE_HTTPS=1`).

- **From the same machine (browser on host):** use **`wss://localhost:8080`**. Do **not** use the container’s internal IP (e.g. `172.19.0.2`) — the host cannot reach it; Docker exposes the server on the host’s port 8080 as localhost.
- **From another device (e.g. phone):** use **`wss://<your-PC-LAN-IP>:8080`** (e.g. `wss://192.168.1.5:8080`).

For plain WS, set `USE_HTTPS=0` in `docker-compose.yml` and use `ws://...`.

## Run without Docker

```bash
npm install
npm start
```

Default port is 8080. Override with `PORT`:

```bash
PORT=3000 npm start
```

### WSS (HTTPS pages)

If your app is served over HTTPS (e.g. Vite with `server.https`), the browser requires **WSS** for the WebSocket (mixed content is blocked). Run the server with TLS:

```bash
npm run start:wss
```

or:

```bash
node src/server.js --wss
```

If you place your own cert and key in `src/` as **`localhost+1.pem`** and **`localhost+1-key.pem`** (e.g. from [mkcert](https://github.com/FiloSottile/mkcert)), the server uses them automatically when run with `--wss` or `USE_HTTPS=1`. Otherwise it falls back to a generated self-signed cert. You can also set **`SSL_CERT_PATH`** and **`SSL_KEY_PATH`** (or `SSL_CERT` / `SSL_KEY`) to point to cert and key files anywhere.

---

## Configurable signaling URL (frontend)

The app can use an explicit signaling URL via **`VITE_SIGNALING_URL`**.

- **If set** – the client uses that URL (e.g. `wss://localhost:8080` when the app and server are on the same machine, or `wss://192.168.x.x:8080` from another device).
- **If not set** – the client uses the same host as the page (so the phone can connect via your PC’s LAN IP when you open the app at `https://192.168.x.x:5173`).

### Connecting when the server runs in Docker (app on same machine)

**Same machine (browser on host):**

Use **`wss://localhost:8080`** — the container’s internal IP (e.g. `172.19.0.2`) is **not** reachable from the host. Either leave `VITE_SIGNALING_URL` unset (if your app uses the page’s host for signaling) or set:

```env
VITE_SIGNALING_URL=wss://localhost:8080
```

Restart the dev server after changing `.env`.

**From your phone:**

- **Option A:** Do **not** set `VITE_SIGNALING_URL`. Open the app on the phone using your PC’s LAN URL (e.g. `https://192.168.x.x:5173`). The app will use that host for signaling (e.g. `wss://192.168.x.x:8080`). Ensure your host’s port **8080** is mapped to the container.
- **Option B:** Set `VITE_SIGNALING_URL` to your PC’s LAN IP and port, e.g. `VITE_SIGNALING_URL=wss://192.168.x.x:8080`, and open the app on the phone from that same PC so 8080 is reachable from the phone.

---

## Message protocol (frontend integration)

All messages are **JSON** over the WebSocket.

### Client → Server

| Action       | Send                                                                 | Notes                                      |
| ------------ | -------------------------------------------------------------------- | ------------------------------------------ |
| Create room  | `{ "type": "create", "roomId"?: "<id>" }`                            | Omit `roomId` to get a server-generated id. Room IDs are **case-insensitive** (e.g. `abc` and `ABC` match). |
| Join room    | `{ "type": "join", "roomId": "<id>" }`                               | Required. Case-insensitive.                |
| Send signal  | `{ "type": "signal", "data": <any> }`                                | Forwarded to the other peer in the room.   |
| Send chat    | `{ "type": "chat", "text": "<string>" }`                             | Forwarded to the other peer in the room.   |
| Leave room   | `{ "type": "leave" }`                                                | Optional; disconnect also leaves the room. |

### Server → Client

| Type          | Payload                          | When |
| ------------- | --------------------------------- | ---- |
| `created`     | `{ "type": "created", "roomId": "<id>" }` | After you create a room. |
| `joined`      | `{ "type": "joined", "roomId": "<id>" }`   | After you join a room. |
| `peer_joined` | `{ "type": "peer_joined" }`                | You are peer A and someone joined. |
| `signal`      | `{ "type": "signal", "data": <any> }`     | Other peer sent a signal; use `data` for SDP/candidates. |
| `chat`        | `{ "type": "chat", "text": "<string>" }`  | Other peer sent a chat message.                          |
| `peer_left`   | `{ "type": "peer_left" }`                 | The other peer left or disconnected. |
| `error`       | `{ "type": "error", "message": "<string>" }` | Invalid request, room not found, room full, etc. |

### Flow

1. **Peer A** sends `create` (optional `roomId`) → receives `created` with `roomId`.
2. **Peer B** sends `join` with that `roomId` → receives `joined`; **Peer A** receives `peer_joined`.
3. Either peer sends `signal` with `data` (e.g. SDP offer/answer or ICE candidate) → the other receives `signal` with the same `data`.
4. When one peer disconnects or sends `leave`, the other receives `peer_left` and the room is removed.
