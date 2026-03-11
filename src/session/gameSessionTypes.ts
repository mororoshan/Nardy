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

/** When mode is "local": play vs bot or two humans (pass & play). */
export type LocalPlayMode = "vsBot" | "twoPlayers";

export interface NardiGameSession {
  mode: "local" | "multiplayer";
  /** Only set when mode is "local": vs bot (AI plays black) or two players on same device. */
  localPlayMode?: LocalPlayMode;
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
  /** Notify peer to start next game (keep match score). Multiplayer only. */
  onNextGame?: () => void;
  /** Notify peer to start new match (reset match score). Multiplayer only. */
  onNewMatch?: () => void;
  /** True when current game was started via ranked matchmaking. */
  isRankedGame?: boolean;
  /** Report game result to server for ELO (ranked only). Call when phase is gameOver. */
  reportGameResult?: (winner: Player) => void;
}
