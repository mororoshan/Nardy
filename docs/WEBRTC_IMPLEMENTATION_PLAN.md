# WebRTC Implementation Plan — Nardi Multiplayer

This plan covers (1) **how peers find each other** (signaling / peer discovery) and (2) **how to implement WebRTC** in the Nardi app step by step.

---

## Part 1: How Peers Find Each Other (Do You Need a Signal Server?)

WebRTC does **not** connect peers by itself. Peers need a way to exchange **SDP offers/answers** and **ICE candidates** before the direct peer-to-peer channel can open. That exchange is **signaling**. You have several options.

### Option A: No server — manual exchange (copy-paste / QR)

**How it works**

- One peer clicks “Create game” → app generates an **offer** (SDP + ICE candidates).
- You show that as a **copyable string** (or QR code). The other player **pastes** it (or scans) in “Join game”.
- The joiner sends back an **answer** (SDP + ICE). The creator pastes that back (or it’s shown on screen for the creator to receive).
- After one round-trip of SDP/ICE, the **data channel** opens. No server needed.

**Pros:** No backend, no hosting, works on localhost and across the internet.  
**Cons:** Awkward UX (copy-paste or QR); not scalable for many concurrent games.  
**Best for:** Demos, testing, playing with a friend (e.g. share link or code once).

**Do you need a signal server?** **No.**

---

### Option B: Simple WebSocket signaling server (your own)

**How it works**

- You run a small **Node (or other) server** with WebSockets.
- “Create game” → server creates a **room ID** (e.g. 6-character code), stores the creator’s WebSocket. Creator waits.
- “Join game” → other peer sends the **room ID**; server puts both in the same room and **forwards** SDP/ICE messages between the two WebSockets.
- Peers never need to copy-paste; they only share the **room code** (or a link with the code). Server is only a message relay; it does not see game state.

**Pros:** Good UX (one code/link to join), you control the server, no third-party signaling.  
**Cons:** You must host and run the server; need a small backend.  
**Best for:** Real product, multiple games, “share code to play”.

**Do you need a signal server?** **Yes** — a minimal WebSocket relay (no game logic on server).

---

### Option C: Third-party signaling / matchmaking

**How it works**

- Use a service that provides **signaling** or **matchmaking**: e.g. **PeerJS** (optional PeerServer), **Firebase Realtime DB**, **Ably**, **PubNub**, or a “serverless” WebSocket (e.g. **PartyKit**, **Hocuspocus**).
- Your app connects to their API; they relay SDP/ICE (and optionally room IDs). You don’t run the signaling process yourself.

**Pros:** Fast to prototype; no server ops for signaling.  
**Cons:** Dependency, possible cost/limits, data goes through their infra.  
**Best for:** Prototypes or if you’re already using one of these.

**Do you need a signal server?** **Not yours** — the third party provides it.

---

### Recommendation

| Goal                         | Suggested approach                    |
|-----------------------------|---------------------------------------|
| Get WebRTC working quickly  | **Option A** (copy-paste or QR)       |
| “Share a code to play” UX   | **Option B** (small WebSocket server)  |
| No backend at all, forever  | **Option A** or **Option C** (3rd party) |

You can **start with Option A** and add **Option B** later: same WebRTC and data-channel code; only the way you get SDP/ICE into the app changes (paste vs receive over WebSocket).

---

## Part 2: Implementation Plan (Step-by-Step)

### Phase 1: Types and messaging (no network yet)

1. **Add sync message types**  
   - New file, e.g. `src/sync/webrtcSyncTypes.ts`.  
   - Define:  
     - `MoveMessage` — `{ type: 'move', from, to, usedDiceIndices }`  
     - `DiceMessage` — `{ type: 'dice', dice: [number, number] }`  
     - `StateMessage` — `{ type: 'state', state: NardiState }`  
     - Optional: `FirstRollMessage` for first-roll phase.  
   - Union type `SyncMessage` and a **parse/validate** helper (so you don’t trust raw JSON blindly).

2. **Ensure NardiState is serializable**  
   - Use JSON.stringify/parse; ensure no functions or non-JSON types. Your current `NardiState` (arrays, numbers, strings) is fine.

---

### Phase 2: Peer connection and data channel (no game logic)

3. **Create a WebRTC + data channel helper**  
   - New file, e.g. `src/sync/webrtcConnection.ts` (or split into `createPeerConnection` + `createDataChannel`).  
   - Use browser APIs: `RTCPeerConnection`, `RTCDataChannel`.  
   - Responsibilities:  
     - Create `RTCPeerConnection` (with optional STUN, e.g. `stun:stun.l.google.com:19302`).  
     - Create one **reliable** data channel (e.g. label `nardi-sync`).  
     - Expose: **send(message: SyncMessage)**, **onMessage(cb)**, **close()**, and connection state (e.g. `connecting` / `connected` / `disconnected`).  
   - Do **not** put game logic here; only open channel and send/receive bytes (e.g. JSON strings).

4. **Implement signaling for Option A (manual)**  
   - Two roles: **offerer** (Create game) and **answerer** (Join game).  
   - **Offerer:** Create PC + data channel → createOffer() → setLocalDescription() → **export** SDP + ICE candidates to a single string (e.g. base64 or JSON). Show in UI: “Share this code” + copy button.  
   - **Answerer:** Input field for “Paste offer” → setRemoteDescription(offer) → createAnswer() → setLocalDescription() → **export** answer string. Show “Share this back to host” + copy.  
   - **Offerer:** Input “Paste answer” → setRemoteDescription(answer) → add any remaining ICE candidates.  
   - After both sides have exchanged SDP and ICE, `connectionstatechange` or `datachannel.open` indicates connected.  
   - Optional: same flow but **QR code** for offer/answer so mobile can scan.

---

### Phase 3: Sync layer (hook + store integration)

5. **Sync hook**  
   - New file, e.g. `src/hooks/useWebRtcSync.ts`.  
   - Responsibilities:  
     - Hold `RTCPeerConnection` + data channel (or use the helper from step 3).  
     - **Outbound:** When the **local** game state changes (move, dice, first roll, full state), send the right `SyncMessage` (move / dice / state).  
     - **Inbound:** On message, **parse** → if `move`: call `applyMove(state, from, to, usedDiceIndices)` and update store; if `dice`: update store’s dice; if `state`: replace store state.  
   - **Important:** Only the **player whose turn it is** sends moves and dice; the other peer only applies. So the hook should send only when the action is from the **local** user (e.g. after `moveTo` / `rollDice` in the UI).  
   - Expose: `connectionStatus`, `startAsOfferer()`, `startAsAnswerer(pastedOffer)`, `applyAnswer(pastedAnswer)` (for Option A), and optionally `disconnect()`.

6. **Integrate with the store**  
   - The sync layer must **update** `nardiGameStore` when **remote** messages arrive (e.g. `useNardiGameStore.getState().set({ state: next })` or a dedicated “applyRemoteMove” that uses `applyMove` and then sets state).  
   - For **local** moves/dice: the store already updates; the sync hook must **observe** that (e.g. subscribe to the store, or the store calls a callback/listener registered by the hook). Prefer: store stays dumb; hook subscribes to store and when `state` or `dice` changes in a way that corresponds to “we just did a local move/roll”, send the message.  
   - Avoid duplicate sends: e.g. only send when the change came from **local** user action (you can track “last action was local” or compare previous state to infer what happened).

---

### Phase 4: First roll and game start

7. **First roll over the wire**  
   - Agree who is “white” and who is “black” (e.g. offerer = white, answerer = black, or send roles in first message).  
   - **Option 1 — Symmetric:** Both peers call `rollForFirstTurn(white)` and `rollForFirstTurn(black)` with **random** values, then exchange `FirstRollMessage` or send full `state` after both rolled. Both apply the same logic (who has higher roll starts) so both get same `phase`, `turn`, `firstRollDice`.  
   - **Option 2 — Host authority:** Creator rolls for both and sends `StateMessage` with `phase: 'playing'` and `turn`/`firstRollDice` set; joiner just applies that state.  
   - Implement one approach so that after connection both sides have identical `phase` and `firstRollDice` and `turn`.

8. **When to send initial state**  
   - After first roll is decided, **creator** (or both) can send one `StateMessage` so the other side is in sync before any move. Then only **move** and **dice** messages for the rest of the game.

---

### Phase 5: UI and signaling server (optional)

9. **UI for connection**  
   - “Create game” → start as offerer; show “Share this code” + copy (and optionally QR).  
   - “Join game” → paste offer → show “Share this answer back” + copy (and optionally QR).  
   - Creator pastes answer → connection completes.  
   - Show “Connected” / “Connecting…” / “Disconnected” from sync hook.  
   - Disable or hide “Create/Join” when connected; optional “Disconnect” / “New game” that closes the channel and resets.

10. **Optional: WebSocket signaling server (Option B)**  
    - Small Node (or Deno/Bun) server: one WebSocket per client; messages `{ type: 'join', roomId }` and `{ type: 'signal', payload }` (SDP or ICE). Server forwards `signal` to the other peer in the same room.  
    - Client: replace “paste” with “Enter room code” → connect to WebSocket → send offer or answer and ICE over the socket. Same WebRTC and data-channel code; only the source of SDP/ICE changes.

---

## Summary: Do You Need a Signal Server?

- **No:** If you use **manual exchange** (copy-paste or QR) or a **third-party** signaling service.  
- **Yes:** If you want a **smooth “share code to play”** experience and you’re willing to run a **small WebSocket relay** (no game logic on server).

You can implement WebRTC and sync **without** your own server by starting with Option A, then add a small signaling server later without changing the core sync or game logic.
