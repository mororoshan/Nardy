/**
 * Builds a unified game session (local or WebRTC) for App and game UI.
 */

import { useMemo } from "react";
import { ConnectionStatus } from "../hooks/useWebRtcSync";
import type { UseWebRtcSyncResult } from "../hooks/useWebRtcSync";
import type { LocalPlayMode, NardiGameSession } from "./gameSessionTypes";

import { ConnectionQuality } from "../hooks/useWebRtcSync";

function buildLocalSession(localPlayMode: LocalPlayMode): NardiGameSession {
  return {
    mode: "local",
    localPlayMode,
    connectionStatus: ConnectionStatus.Connected,
    connectionQuality: ConnectionQuality.Offline,
    roomId: null,
    localPlayer: null,
    onAfterMove: () => {},
    onAfterPass: () => {},
    onAfterRoll: () => {},
    onAfterFirstRoll: () => {},
    leaveGame: () => {},
    copyRoomCode: () => {},
    sendChat: () => {},
    canRejoin: false,
  };
}

export function useGameSession(
  mode: "local" | "multiplayer",
  sync: UseWebRtcSyncResult,
  localPlayMode: LocalPlayMode = "vsBot",
): NardiGameSession {
  return useMemo(() => {
    if (mode === "local") return buildLocalSession(localPlayMode);
    return {
      mode: "multiplayer",
      connectionStatus: sync.connectionStatus,
      connectionQuality: sync.connectionQuality,
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
      onRejoin: sync.rejoinFromLastRoom,
      canRejoin: sync.canRejoin,
      onNextGame: () => sync.sendNewGame(false),
      onNewMatch: () => sync.sendNewGame(true),
      isRankedGame: sync.isRankedGame,
      reportGameResult: sync.reportGameResult,
      playerRating: sync.playerRating,
    };
  }, [mode, sync, localPlayMode]);
}
