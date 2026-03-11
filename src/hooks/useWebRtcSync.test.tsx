/**
 * Unit tests for useWebRtcSync.
 *
 * Integration tests (onIdentified -> playerRating, fetchLeaderboard -> leaderboardEntries)
 * are deferred: the hook’s many dependencies (stores, webrtcConnection, signaling,
 * playerIdentity) make full mocking heavy; consider E2E or dedicated integration tests later.
 */

import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useWebRtcSync } from "./useWebRtcSync";

describe("useWebRtcSync", () => {
  it("returns initial state with playerRating null and leaderboard API", () => {
    const { result } = renderHook(() => useWebRtcSync());

    expect(result.current.playerRating).toBeNull();
    expect(result.current.leaderboardEntries).toBeNull();
    expect(result.current.leaderboardError).toBeNull();
    expect(result.current.leaderboardLoading).toBe(false);
    expect(typeof result.current.fetchLeaderboard).toBe("function");
  });
});
