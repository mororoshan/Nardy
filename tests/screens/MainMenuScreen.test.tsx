/**
 * Smoke tests for MainMenuScreen (routing entry for menu).
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { UseWebRtcSyncResult } from "../../src/hooks/useWebRtcSync";
import { AuthProvider } from "../../src/contexts/AuthContext";
import { MainMenuScreen } from "../../src/screens/MainMenuScreen";

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
    remotePeerDisplayName: null,
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
      <AuthProvider>
        <MainMenuScreen
          sync={mockSync}
          navigate={mockNavigate}
          setRankedSearchStarted={mockSetRankedSearchStarted}
          isNarrow={false}
        />
      </AuthProvider>,
    );

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Backgammon",
    );
    expect(screen.getByText("Two players")).toBeTruthy();
  });
});
