/**
 * Game session abstraction: local vs multiplayer (WebRTC).
 * UI consumes a single session object instead of separate booleans and callbacks.
 */

import type { Player } from "../game/direction";
import type { ConnectionStatusValue } from "../hooks/useWebRtcSync";
import type { MovePayload } from "../sync/webrtcSyncTypes";

export interface NardiGameSession {
  mode: "local" | "multiplayer";
  connectionStatus: ConnectionStatusValue;
  roomId: string | null;
  localPlayer: Player | null;
  onAfterMove: (payload: MovePayload) => void;
  onAfterPass: () => void;
  onAfterRoll: (dice: [number, number]) => void;
  onAfterFirstRoll: () => void;
  leaveGame: () => void;
  copyRoomCode: () => void;
}
