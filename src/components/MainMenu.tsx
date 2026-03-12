import type { CSSProperties } from "react";
import { useState } from "react";
import { theme } from "../theme";
import { getRoomFromUrl } from "../sync/roomUrl";
import type { LeaderboardEntry } from "../sync/signalingClient";
import { Button } from "./ui";
import type { QueueStatus } from "../hooks/useWebRtcSync";

const MIN_TOUCH_HEIGHT = 44;

export interface MainMenuProps {
  onCreateGame: () => Promise<void>;
  onJoinGame: (roomId: string) => Promise<void>;
  /** Ranked matchmaking: join queue and wait for match. */
  onPlayRanked?: () => Promise<void>;
  /** Cancel ranked queue search. */
  onCancelRanked?: () => void;
  /** "searching" while in ranked queue. */
  queueStatus?: QueueStatus;
  /** Re-create room as host with the same room id (for creator rejoin). */
  onRejoinAsHost?: (roomId: string) => Promise<void>;
  /** Play vs bot (AI plays black). */
  onSinglePlayer: () => void;
  /** Play offline, two players on same device (pass & play). */
  onTwoPlayers: () => void;
  touchFriendly?: boolean;
  /** ELO rating from server (identified); shown in Connect section when set. */
  playerRating?: number | null;
  /** Open/fetch leaderboard (e.g. sync.fetchLeaderboard). */
  onOpenLeaderboard?: () => void;
  /** Leaderboard entries from last fetch; null until loaded or on error. */
  leaderboardEntries?: LeaderboardEntry[] | null;
  /** Error message from last leaderboard fetch. */
  leaderboardError?: string | null;
  /** True while leaderboard is loading. */
  leaderboardLoading?: boolean;
}

const rootStyle: CSSProperties = {
  minHeight: "100vh",
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: theme.spacing.lg,
  color: theme.colors.text,
};

const cardStyle: CSSProperties = {
  backgroundColor: theme.menu.backgroundOverlay,
  borderRadius: 16,
  border: `3px solid ${theme.menu.woodBorder}`,
  outline: `1px solid ${theme.menu.gold}`,
  outlineOffset: 2,
  padding: theme.spacing.xl * 2,
  maxWidth: 560,
  width: "100%",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
};

const titleStyle: CSSProperties = {
  color: theme.menu.gold,
  fontSize: 32,
  fontWeight: 600,
  fontFamily: "Georgia, serif",
  margin: 0,
  marginBottom: theme.spacing.xl,
  textAlign: "center",
};

const columnsStyle: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  gap: theme.spacing.xl,
  alignItems: "flex-start",
};

const columnsStyleNarrow: CSSProperties = {
  flexDirection: "column",
};

const sectionBase: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: theme.spacing.lg,
};

const sectionHeadingStyle: CSSProperties = {
  fontSize: theme.fontSize.sm,
  fontWeight: 600,
  color: theme.menu.gold,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  margin: 0,
  marginBottom: theme.spacing.xs,
  paddingBottom: theme.spacing.xs,
  borderBottom: `1px solid ${theme.menu.gold}`,
  width: "100%",
  textAlign: "center",
};

const menuButtonStyle: CSSProperties = {
  backgroundColor: theme.menu.buttonBg,
  color: theme.menu.goldMuted,
  border: `1px solid ${theme.menu.gold}`,
  borderRadius: theme.borderRadius.md,
};

const rejoinButtonStyle: CSSProperties = {
  ...menuButtonStyle,
  backgroundColor: theme.menu.rejoinHighlight,
};

const rowStyle: CSSProperties = {
  display: "flex",
  gap: theme.spacing.sm,
  alignItems: "center",
  flexWrap: "wrap",
  justifyContent: "center",
};

export function MainMenu({
  onCreateGame,
  onJoinGame,
  onPlayRanked,
  onCancelRanked,
  queueStatus = "idle",
  onRejoinAsHost,
  onSinglePlayer,
  onTwoPlayers,
  touchFriendly = false,
  playerRating = null,
  onOpenLeaderboard,
  leaderboardEntries = null,
  leaderboardError = null,
  leaderboardLoading = false,
}: MainMenuProps) {
  const roomInUrl = getRoomFromUrl();
  const [joinRoomId, setJoinRoomId] = useState(roomInUrl ?? "");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaderboardExpanded, setLeaderboardExpanded] = useState(false);
  const searching = queueStatus === "searching";
  const isNarrow = touchFriendly;

  const touchTargetStyle: CSSProperties | undefined = touchFriendly
    ? { minHeight: MIN_TOUCH_HEIGHT }
    : undefined;

  const inputStyle: CSSProperties = {
    padding: "10px 14px",
    fontSize: theme.fontSize.lg,
    backgroundColor: theme.menu.inputBg,
    color: theme.colors.text,
    border: `1px solid ${theme.menu.gold}`,
    borderRadius: theme.borderRadius.md,
    minWidth: 200,
    ...(touchFriendly && { minHeight: MIN_TOUCH_HEIGHT }),
  };

  const handleCreate = async () => {
    setError(null);
    setLoading("create");
    try {
      await onCreateGame();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create game");
    } finally {
      setLoading(null);
    }
  };

  const handleJoin = async () => {
    const id = joinRoomId.trim();
    if (!id) {
      setError("Enter a room code");
      return;
    }
    setError(null);
    setLoading("join");
    try {
      await onJoinGame(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join game");
    } finally {
      setLoading(null);
    }
  };

  const handleRejoin = async () => {
    if (!roomInUrl) return;
    setError(null);
    setLoading("rejoin");
    try {
      await onJoinGame(roomInUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to rejoin game");
    } finally {
      setLoading(null);
    }
  };

  const handleRejoinAsHost = async () => {
    if (!roomInUrl || !onRejoinAsHost) return;
    setError(null);
    setLoading("rejoinHost");
    try {
      await onRejoinAsHost(roomInUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to rejoin as host");
    } finally {
      setLoading(null);
    }
  };

  return (
    <main style={rootStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Backgammon</h1>
        <div
          style={{
            ...columnsStyle,
            ...(isNarrow ? columnsStyleNarrow : {}),
          }}
        >
          <section aria-labelledby="play-heading" style={sectionBase}>
            <h2 id="play-heading" style={sectionHeadingStyle}>
              PLAY
            </h2>
            <Button
              size="lg"
              onClick={onSinglePlayer}
              disabled={loading !== null}
              style={{ ...menuButtonStyle, ...touchTargetStyle }}
              title="Play vs computer (you are White)"
            >
              Vs bot
            </Button>
            <Button
              size="lg"
              onClick={onTwoPlayers}
              disabled={loading !== null}
              style={{ ...menuButtonStyle, ...touchTargetStyle }}
              title="Two players on this device (pass and play)"
            >
              Two players
            </Button>
          </section>

          <section
            aria-labelledby="connect-heading"
            style={{
              ...sectionBase,
              ...(isNarrow && { gap: theme.spacing.xl }),
            }}
          >
            <h2 id="connect-heading" style={sectionHeadingStyle}>
              CONNECT
            </h2>
            {onPlayRanked && (
              <>
                <Button
                  size="lg"
                  onClick={async () => {
                    setError(null);
                    setLoading("ranked");
                    try {
                      await onPlayRanked();
                      setLoading(null);
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : "Failed to join queue",
                      );
                      setLoading(null);
                    }
                  }}
                  disabled={loading !== null || searching}
                  style={{
                    ...menuButtonStyle,
                    ...touchTargetStyle,
                    ...(searching
                      ? { backgroundColor: theme.colors.surfaceElevated }
                      : {}),
                  }}
                >
                  {searching
                    ? "Searching for match…"
                    : loading === "ranked"
                      ? "Joining…"
                      : "Play ranked"}
                </Button>
                {playerRating != null && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: theme.fontSize.sm,
                      color: theme.menu.goldMuted,
                    }}
                  >
                    Your rating: {playerRating}
                  </p>
                )}
                {searching && onCancelRanked && (
                  <Button
                    size="lg"
                    onClick={onCancelRanked}
                    style={{ ...menuButtonStyle, ...touchTargetStyle }}
                  >
                    Cancel
                  </Button>
                )}
              </>
            )}
            {onOpenLeaderboard && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: theme.spacing.sm,
                  alignItems: "center",
                }}
                role="group"
                aria-label="Leaderboard"
              >
                <Button
                  size="lg"
                  onClick={() => {
                    setLeaderboardExpanded(true);
                    onOpenLeaderboard();
                  }}
                  disabled={leaderboardLoading || loading !== null}
                  style={{ ...menuButtonStyle, ...touchTargetStyle }}
                  title={
                    leaderboardExpanded
                      ? "Leaderboard (shown)"
                      : "Show leaderboard"
                  }
                >
                  {leaderboardLoading ? "Loading…" : "Leaderboard"}
                </Button>
                {leaderboardError && (
                  <p
                    role="alert"
                    style={{
                      margin: 0,
                      fontSize: theme.fontSize.sm,
                      color: theme.colors.error,
                    }}
                  >
                    {leaderboardError}
                  </p>
                )}
                {leaderboardExpanded &&
                  !leaderboardLoading &&
                  leaderboardEntries != null && (
                    <div
                      style={{
                        width: "100%",
                        maxWidth: 320,
                        maxHeight: 240,
                        overflow: "auto",
                        fontSize: theme.fontSize.sm,
                        backgroundColor: theme.menu.inputBg,
                        border: `1px solid ${theme.menu.gold}`,
                        borderRadius: theme.borderRadius.md,
                        padding: theme.spacing.sm,
                      }}
                    >
                      <table
                        style={{ width: "100%", borderCollapse: "collapse" }}
                        aria-label="Leaderboard"
                      >
                        <thead>
                          <tr>
                            <th
                              style={{
                                textAlign: "left",
                                padding: theme.spacing.xs,
                                color: theme.menu.goldMuted,
                              }}
                            >
                              Rank
                            </th>
                            <th
                              style={{
                                textAlign: "left",
                                padding: theme.spacing.xs,
                                color: theme.menu.goldMuted,
                              }}
                            >
                              Name
                            </th>
                            <th
                              style={{
                                textAlign: "right",
                                padding: theme.spacing.xs,
                                color: theme.menu.goldMuted,
                              }}
                            >
                              Rating
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaderboardEntries.map((entry) => (
                            <tr key={entry.playerId}>
                              <td style={{ padding: theme.spacing.xs }}>
                                {entry.rank}
                              </td>
                              <td style={{ padding: theme.spacing.xs }}>
                                {entry.displayName || entry.playerId}
                              </td>
                              <td
                                style={{
                                  padding: theme.spacing.xs,
                                  textAlign: "right",
                                }}
                              >
                                {entry.rating}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
              </div>
            )}
            <Button
              size="lg"
              onClick={handleCreate}
              disabled={loading !== null || searching}
              style={{ ...menuButtonStyle, ...touchTargetStyle }}
            >
              {loading === "create" ? "Creating…" : "Create game"}
            </Button>
            <div style={rowStyle}>
              <input
                type="text"
                aria-label="Room code"
                placeholder="Room code"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                style={inputStyle}
                disabled={loading !== null}
              />
              <Button
                size="lg"
                onClick={handleJoin}
                disabled={loading !== null}
                style={{ ...menuButtonStyle, ...touchTargetStyle }}
              >
                {loading === "join" ? "Joining…" : "Join game"}
              </Button>
            </div>
            {roomInUrl && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: theme.spacing.sm,
                  alignItems: "center",
                }}
              >
                <Button
                  size="lg"
                  onClick={handleRejoin}
                  disabled={loading !== null}
                  style={{ ...rejoinButtonStyle, ...touchTargetStyle }}
                >
                  {loading === "rejoin"
                    ? "Rejoining…"
                    : `Rejoin (${roomInUrl})`}
                </Button>
                {onRejoinAsHost && (
                  <Button
                    size="lg"
                    onClick={handleRejoinAsHost}
                    disabled={loading !== null}
                    style={{ ...menuButtonStyle, ...touchTargetStyle }}
                  >
                    {loading === "rejoinHost"
                      ? "Recreating…"
                      : "Rejoin as host"}
                  </Button>
                )}
              </div>
            )}
            {error && (
              <p
                role="alert"
                style={{
                  color: theme.colors.error,
                  margin: 0,
                  fontSize: theme.fontSize.sm,
                }}
              >
                {error}
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
