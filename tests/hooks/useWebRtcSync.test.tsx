/**
 * Unit tests for useWebRtcSync.
 *
 * Integration tests (onIdentified -> playerRating, fetchLeaderboard -> leaderboardEntries)
 * are deferred: the hook's many dependencies (stores, webrtcConnection, signaling,
 * playerIdentity) make full mocking heavy; consider E2E or dedicated integration tests later.
 */

import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AuthProvider } from "../../src/contexts/AuthContext";
import { useWebRtcSync } from "../../src/hooks/useWebRtcSync";

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe("useWebRtcSync", () => {
  it("returns initial state with playerRating null and leaderboard API", () => {
    const { result } = renderHook(() => useWebRtcSync(), { wrapper });

    expect(result.current.playerRating).toBeNull();
    expect(result.current.leaderboardEntries).toBeNull();
    expect(result.current.leaderboardError).toBeNull();
    expect(result.current.leaderboardLoading).toBe(false);
    expect(result.current.remotePeerDisplayName).toBeNull();
    expect(typeof result.current.fetchLeaderboard).toBe("function");
  });
});
