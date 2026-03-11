/**
 * Smoke tests for MainMenuScreen (routing entry for menu).
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { UseWebRtcSyncResult } from "../hooks/useWebRtcSync";
import { MainMenuScreen } from "./MainMenuScreen";

function createMockSync(): UseWebRtcSyncResult {
  return {
    connectionStatus: "disconnected",
    connectionQuality: "offline",
    roomId: null,
    isCreator: null,
    localPlayer: null,
    queueStatus: "idle",
    isRankedGame: false,
    createGame: vi.fn().mockResolvedValue(undefined),
    joinGame: vi.fn().mockResolvedValue(undefined),
    joinRankedQueue: vi.fn().mockResolvedValue(undefined),
    leaveRankedQueue: vi.fn(),
    leaveGame: vi.fn(),
    rejoinFromLastRoom: vi.fn().mockResolvedValue(undefined),
    canRejoin: false,
    playerRating: null,
    fetchLeaderboard: vi.fn().mockResolvedValue(undefined),
    leaderboardEntries: null,
    leaderboardError: null,
    leaderboardLoading: false,
    lastSignalingError: null,
    reportGameResult: vi.fn(),
    sendDice: vi.fn(),
    sendCurrentState: vi.fn(),
    sendMove: vi.fn(),
    sendPass: vi.fn(),
    sendChat: vi.fn(),
    sendNewGame: vi.fn(),
  };
}

describe("MainMenuScreen", () => {
  it("renders menu with play options", () => {
    const mockSync = createMockSync();
    const mockNavigate = vi.fn();
    const mockSetRankedSearchStarted = vi.fn();

    render(
      <MainMenuScreen
        sync={mockSync}
        navigate={mockNavigate}
        setRankedSearchStarted={mockSetRankedSearchStarted}
        isNarrow={false}
      />,
    );

    expect(screen.getByText("Two players")).toBeTruthy();
  });
});
