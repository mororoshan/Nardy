# WebRTC Implementation — Code Review

**Scope:** Main menu, multiplayer lobby, sync types, signaling client, WebRTC connection, sync hook, store integration, MultiplayerLobby, game screen with localPlayer/turn gating.  
**References:** `docs/WEBRTC_IMPLEMENTATION_PLAN.md`, `docs/SIGNAL_SERVER_README.md`, `.cursor/skills/webrtc-nardi-sync/SKILL.md`, `.cursor/rules/code-conventions.mdc`.

---

## Summary

- **Plan alignment:** All planned pieces exist: main menu (single/multiplayer), `src/sync/webrtcSyncTypes.ts`, `src/sync/signalingClient.ts`, `src/sync/webrtcConnection.ts`, `src/hooks/useWebRtcSync.ts`, store integration via `applyRemoteState`, MultiplayerLobby, game screen with `localPlayer` / `isMultiplayer` and turn gating in BackgammonBoard, GameStatus, DiceDisplay. Signaling uses create/join/signal with `data`; client handles created, joined, peer_joined, signal, peer_left, error. Sync is move-based with applyMove, full state for init and after first roll; one authority per turn; message shapes move, dice, state, firstRoll.
- **Conventions:** TypeScript strict, type imports, relative paths, PascalCase components, camelCase modules, game logic in `src/game/`, styles with `CSSProperties`, JSDoc on sync modules. No duplicate game rules in UI.
- **Issues found:** Several correctness and edge-case items (see below). Fixes are delegated to the feature subagent.

---

## Findings

### 1. **onPeerLeft does not clean up connection/signaling**  
**File:** `src/hooks/useWebRtcSync.ts` (createGame and joinGame callbacks, ~249–252 and ~305–308)

**What’s wrong:** When the other peer leaves, only `setConnectionStatus("disconnected")` and `setErrorMessage("Opponent left")` are called. `connectionRef` and `signalingRef` are never closed, so WebRTC and WebSocket stay open and refs stay set. User is left in `multi_game` with “disconnected” while resources leak.

**Why it matters:** Resource leak, inconsistent state, and the app still “thinks” it has a connection (refs non-null).

**Fix:** In both `onPeerLeft` handlers (create and join flows), call `disconnect()` so the connection and signaling client are closed, refs cleared, and localPlayer/roomId/errorMessage reset. Keep showing “Opponent left” via the error message that `disconnect()` can leave set, or set it right before calling `disconnect()` if you clear it inside `disconnect()` (then set error message after disconnect so it persists).

---

### 2. **NardiState validation for firstRollDice is incomplete**  
**File:** `src/sync/webrtcSyncTypes.ts` (e.g. lines 41–63, `isNardiStateLike`)

**What’s wrong:**  
- `typeof o.firstRollDice === "object"` is true for `null` in JavaScript, so `firstRollDice: null` would pass.  
- The shape of `firstRollDice` is not validated: it should be an object with `white: number | null` and `black: number | null`. Malformed or partial state could break `applyRemoteState` or UI (e.g. `state.firstRollDice.white`).

**Why it matters:** Safety and correctness when receiving `state` messages from the network.

**Fix:** In `isNardiStateLike`, require `o.firstRollDice !== null && typeof o.firstRollDice === "object"`, and ensure `firstRollDice` has both `white` and `black` as either number (1–6) or null (e.g. check `(typeof (o.firstRollDice as Record<string, unknown>).white === 'number' || (o.firstRollDice as Record<string, unknown>).white === null)` and the same for `black`).

---

### 3. **Signaling WebSocket onClose is never handled in the sync hook**  
**File:** `src/hooks/useWebRtcSync.ts` (createGame and joinGame: `setCallbacks` objects)

**What’s wrong:** `SignalingClient` supports `onClose`, but the sync hook never sets it. If the signaling WebSocket closes unexpectedly (server down, network drop), status is never set to disconnected and the hook never cleans up.

**Why it matters:** User can be stuck in “connecting” or “connected” with a dead socket; no feedback or cleanup.

**Fix:** In both create and join `setCallbacks`, set `onClose: () => { ... }` to call `disconnect()` (or at least set connection status to `"disconnected"` and clear refs / call existing cleanup so the UI and refs reflect the closed connection).

---

### 4. **disconnect() does not send leave before closing the socket**  
**File:** `src/hooks/useWebRtcSync.ts` (disconnect callback, ~191–205)

**What’s wrong:** `disconnect()` calls `signalingRef.current?.close()` without calling `signalingRef.current?.leave()` first. The protocol (`docs/SIGNAL_SERVER_README.md`) defines an explicit `leave` so the server can clean up the room and notify the other peer promptly.

**Why it matters:** Protocol compliance and predictable server-side cleanup; the other peer gets `peer_left` via explicit leave rather than only on TCP drop.

**Fix:** In `disconnect()`, before `signalingRef.current?.close()`, call `signalingRef.current?.leave()` when the socket is open (e.g. only if `signalingRef.current?.isOpen` or equivalent), then call `close()`.

---

### 5. **Optional: Align type name with plan**  
**File:** `src/sync/webrtcSyncTypes.ts`

**What’s wrong:** The plan calls the union type “SyncMessage” and the helper “parse/validate”; the code uses `DataChannelMessage` and `parseDataChannelMessage`. Behavior is correct; only naming differs from the plan.

**Fix (optional):** Add a type alias `export type SyncMessage = DataChannelMessage` (and optionally export a `parseSyncMessage` that forwards to `parseDataChannelMessage`) so the plan’s naming is reflected in the public API.

---

## What was checked and is OK

- **Signal server protocol:** Client sends create/join/signal with `data`; handles created, joined, peer_joined, signal, peer_left, error. Matches `docs/SIGNAL_SERVER_README.md`.
- **Sync logic:** Move-based sync with `applyMove(state, from, to, usedDiceIndices)`; full state for init and after first roll; only the player whose turn it is sends moves/dice; first roll: both send firstRoll, white sends state after merge; turn/dice and “send state when local player just ended turn” logic are correct.
- **Store integration:** Sync updates store via `applyRemoteState`; hook subscribes to store and sends only on local actions; `remoteUpdateRef` used to avoid echoing remote updates.
- **UI gating:** BackgammonBoard, GameStatus, DiceDisplay use `localPlayer` and `isMultiplayer` for turn and roll visibility; single player gets `localPlayer === null` and `isMultiplayer === false`.
- **Conventions:** Strict TypeScript, type imports, relative paths, naming, `CSSProperties` for styles, JSDoc on sync/game modules, no game rules duplicated in UI.
- **Edge cases:** Data channel close triggers `disconnect()`; back-from-game and lobby-back call `disconnect()`. Remaining gap is peer_left and signaling onClose (covered above).

---

## Delegation to feature subagent

1. **Must fix:**  
   - **onPeerLeft cleanup:** In `src/hooks/useWebRtcSync.ts`, in both create and join `onPeerLeft` callbacks, call `disconnect()` so the connection and signaling are closed and refs cleared (and optionally set or preserve “Opponent left” message).  
   - **firstRollDice validation:** In `src/sync/webrtcSyncTypes.ts`, in `isNardiStateLike`, require non-null object for `firstRollDice` and validate `white` and `black` as number | null (and value in 1–6 when number).  
   - **Signaling onClose:** In `src/hooks/useWebRtcSync.ts`, in both create and join `setCallbacks`, add `onClose` that calls `disconnect()` (or equivalent cleanup) so unexpected WebSocket close updates status and refs.  
   - **Leave before close:** In `src/hooks/useWebRtcSync.ts`, in `disconnect()`, call `signalingRef.current?.leave()` before `signalingRef.current?.close()` when the socket is open.

2. **Optional:**  
   - Add `SyncMessage` alias (and optionally `parseSyncMessage`) in `src/sync/webrtcSyncTypes.ts` to match the plan’s naming.

All of the above should be implemented by the **feature** subagent; this review does not modify code directly.
