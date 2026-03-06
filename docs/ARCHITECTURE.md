# Architecture: web_rtc_nardi

## State ownership

- **Single source of truth:** Game state is owned by the **Zustand store** (`src/stores/nardiGameStore.ts`). There is no React Context provider; `useNardiGame()` is a typed facade over the store.
- **Sync layer:** WebRTC sync (`src/hooks/useWebRtcSync.ts`, `src/sync/*`) does not keep a separate copy of the game. It only reads and writes the store via `useNardiGameStore.getState()` and `setState()`. Remote moves and state replacements are applied directly to the store.
- **UI:** Components use `useNardiGame()` or `useNardiGameStore` and call into `src/game/nardiState.ts` only for read-only helpers (e.g. `getLegalMoves`, `getLegalDestinationsFromPoint`). They do not duplicate move validation.

## Sync semantics

- **Reconnection:** There is no automatic reconnect. To resume after leaving or a dropped connection, the user must use **Rejoin** (room ID is kept in the URL via `?room=...`). After rejoin, the joiner receives full state when the creator’s data channel opens and sends a `State` message. The joiner can also send a `RequestState` message to request a full state sync.
- **Conflict model:** There are no version vectors or sequence numbers. If both peers send at once, the **last message processed wins** (per message type). Turn-taking and “my turn” UI reduce concurrent writes in practice.
- **Message types:** `State` (full replace), `Move` (single move), `Dice`, `Pass`, `RequestState` (joiner requests full state; peer replies with `State`). See `src/sync/webrtcSyncTypes.ts`.

## Layering

- **Game layer** (`src/game/`): Pure logic; no React, DOM, or sync. `nardiState.ts`, `boardGeometry.ts`, `direction.ts`.
- **Store:** Depends only on game. Holds `state`, `selectedPoint`, `gameHistory`, and actions that call into `nardiState`.
- **Sync:** Depends on game and store. Signaling + WebRTC data channel; handles incoming messages and updates the store.
- **UI:** Depends on store, hooks, and game (read-only). Renders board and controls; dispatches actions to the store and, in multiplayer, to the sync layer (e.g. `sendMove`, `sendPass`).
