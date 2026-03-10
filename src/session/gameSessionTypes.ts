/**
 * Game session abstraction: local vs multiplayer (WebRTC).
 * UI consumes a single session object instead of separate booleans and callbacks.
 */

import type { Player } from "../game/direction";
import type {
  ConnectionStatusValue,
  ConnectionQualityValue,
} from "../hooks/useWebRtcSync";
import type { MovePayload } from "../sync/webrtcSyncTypes";

export interface NardiGameSession {
  mode: "local" | "multiplayer";
  connectionStatus: ConnectionStatusValue;
  /** When connected: excellent / good / poor; when disconnected: offline. */
  connectionQuality: ConnectionQualityValue;
  roomId: string | null;
  localPlayer: Player | null;
  onAfterMove: (payload: MovePayload) => void;
  onAfterPass: () => void;
  onAfterRoll: (dice: [number, number]) => void;
  onAfterFirstRoll: () => void;
  leaveGame: () => void;
  copyRoomCode: () => void;
  /** Send quickchat text (multiplayer only; no-op in local). */
  sendChat: (text: string) => void;
  /** Rejoin last room (multiplayer only; after disconnect). */
  onRejoin?: () => Promise<void>;
  /** True when rejoin is available (last room in storage). */
  canRejoin?: boolean;
}
