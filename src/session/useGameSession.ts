/**
 * Builds a unified game session (local or WebRTC) for App and game UI.
 */

import { useMemo } from "react";
import { ConnectionStatus } from "../hooks/useWebRtcSync";
import type { UseWebRtcSyncResult } from "../hooks/useWebRtcSync";
import type { NardiGameSession } from "./gameSessionTypes";

const LOCAL_SESSION: NardiGameSession = {
  mode: "local",
  connectionStatus: ConnectionStatus.Connected,
  roomId: null,
  localPlayer: null,
  onAfterMove: () => {},
  onAfterPass: () => {},
  onAfterRoll: () => {},
  onAfterFirstRoll: () => {},
  leaveGame: () => {},
  copyRoomCode: () => {},
  sendChat: () => {},
};

export function useGameSession(
  mode: "local" | "multiplayer",
  sync: UseWebRtcSyncResult,
): NardiGameSession {
  return useMemo(() => {
    if (mode === "local") return LOCAL_SESSION;
    return {
      mode: "multiplayer",
      connectionStatus: sync.connectionStatus,
      roomId: sync.roomId,
      localPlayer: sync.localPlayer,
      onAfterMove: sync.sendMove,
      onAfterPass: sync.sendPass,
      onAfterRoll: sync.sendDice,
      onAfterFirstRoll: sync.sendCurrentState,
      leaveGame: sync.leaveGame,
      copyRoomCode: () => {
        if (sync.roomId) void navigator.clipboard.writeText(sync.roomId);
      },
      sendChat: sync.sendChat,
    };
  }, [
    mode,
    sync.connectionStatus,
    sync.roomId,
    sync.localPlayer,
    sync.sendMove,
    sync.sendPass,
    sync.sendDice,
    sync.sendCurrentState,
    sync.leaveGame,
    sync.sendChat,
  ]);
}
