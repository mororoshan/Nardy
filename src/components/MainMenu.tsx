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
  display: "flex",
  flexDirection: "row",
  minHeight: "100vh",
  width: "100%",
  backgroundColor: theme.colors.background,
  color: theme.colors.text,
};

const rootStyleNarrow: CSSProperties = {
  flexDirection: "column",
};

const panelBase: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: theme.spacing.lg,
  padding: theme.spacing.xl,
};

const playPanelStyle: CSSProperties = {
  ...panelBase,
  backgroundColor: theme.colors.surface,
  borderRight: `1px solid ${theme.colors.sidebarBorder}`,
};

const playPanelStyleNarrow: CSSProperties = {
  borderRight: "none",
  borderBottom: `1px solid ${theme.colors.sidebarBorder}`,
};

const connectPanelStyle: CSSProperties = {
  ...panelBase,
  backgroundColor: theme.colors.background,
};

const barStyle: CSSProperties = {
  flexShrink: 0,
  width: 48,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.colors.surfaceElevated,
  padding: theme.spacing.lg,
};

const barStyleNarrow: CSSProperties = {
  width: "100%",
  minHeight: 56,
  padding: theme.spacing.md,
};

const titleStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 600,
  color: theme.colors.text,
  margin: 0,
  writingMode: "vertical-rl" as const,
  textOrientation: "mixed",
  letterSpacing: "0.05em",
  transform: "rotate(180deg)",
};

const titleStyleNarrow: CSSProperties = {
  writingMode: "horizontal-tb",
  transform: "none",
  letterSpacing: "normal",
};

const sectionLabelStyle: CSSProperties = {
  fontSize: theme.fontSize.sm,
  fontWeight: 600,
  color: theme.colors.textMuted,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  margin: 0,
  marginBottom: theme.spacing.xs,
};

const inputStyle: CSSProperties = {
  padding: "10px 14px",
  fontSize: theme.fontSize.lg,
  backgroundColor: theme.colors.surface,
  color: theme.colors.text,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadius.md,
  minWidth: 200,
};

const rowStyle: CSSProperties = {
  display: "flex",
  gap: theme.spacing.sm,
  alignItems: "center",
  flexWrap: "wrap" as const,
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

  const inputStyleResolved: CSSProperties = {
    ...inputStyle,
    ...(touchFriendly && { minHeight: MIN_TOUCH_HEIGHT }),
  };
  const touchTargetStyle = touchFriendly
    ? { minHeight: MIN_TOUCH_HEIGHT }
    : undefined;

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

  const isNarrow = touchFriendly;

  return (
    <main
      style={{
        ...rootStyle,
        ...(isNarrow ? rootStyleNarrow : {}),
      }}
    >
      <section
        aria-labelledby="play-heading"
        style={{
          ...playPanelStyle,
          ...(isNarrow ? playPanelStyleNarrow : {}),
          ...(isNarrow && {
            gap: theme.spacing.xl,
            padding: theme.spacing.xl * 1.5,
          }),
        }}
      >
        <h2 id="play-heading" style={sectionLabelStyle}>
          Play
        </h2>
        <Button
          size="lg"
          onClick={onSinglePlayer}
          disabled={loading !== null}
          style={touchTargetStyle}
          title="Play vs computer (you are White)"
        >
          Vs bot
        </Button>
        <Button
          size="lg"
          variant="secondary"
          onClick={onTwoPlayers}
          disabled={loading !== null}
          style={touchTargetStyle}
          title="Two players on this device (pass and play)"
        >
          Two players
        </Button>
      </section>

      <div
        style={{
          ...barStyle,
          ...(isNarrow ? barStyleNarrow : {}),
        }}
      >
        <h1
          style={{
            ...titleStyle,
            ...(isNarrow ? titleStyleNarrow : {}),
          }}
        >
          Nardi
        </h1>
      </div>

      <section
        aria-labelledby="connect-heading"
        style={{
          ...connectPanelStyle,
          ...(isNarrow && {
            gap: theme.spacing.xl,
            padding: theme.spacing.xl * 1.5,
          }),
        }}
      >
        <h2 id="connect-heading" style={sectionLabelStyle}>
          Connect
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
                  color: theme.colors.textMuted,
                }}
              >
                Your rating: {playerRating}
              </p>
            )}
            {searching && onCancelRanked && (
              <Button
                size="lg"
                variant="secondary"
                onClick={onCancelRanked}
                style={touchTargetStyle}
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
              variant="secondary"
              onClick={() => {
                setLeaderboardExpanded(true);
                onOpenLeaderboard();
              }}
              disabled={leaderboardLoading || loading !== null}
              style={touchTargetStyle}
              title={
                leaderboardExpanded ? "Leaderboard (shown)" : "Show leaderboard"
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
                    backgroundColor: theme.colors.surface,
                    border: `1px solid ${theme.colors.border}`,
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
                            color: theme.colors.textMuted,
                          }}
                        >
                          Rank
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: theme.spacing.xs,
                            color: theme.colors.textMuted,
                          }}
                        >
                          Name
                        </th>
                        <th
                          style={{
                            textAlign: "right",
                            padding: theme.spacing.xs,
                            color: theme.colors.textMuted,
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
          style={touchTargetStyle}
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
            style={inputStyleResolved}
            disabled={loading !== null}
          />
          <Button
            size="lg"
            onClick={handleJoin}
            disabled={loading !== null}
            style={touchTargetStyle}
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
              style={{
                backgroundColor: theme.colors.accent,
                ...touchTargetStyle,
              }}
              onClick={handleRejoin}
              disabled={loading !== null}
            >
              {loading === "rejoin" ? "Rejoining…" : `Rejoin (${roomInUrl})`}
            </Button>
            {onRejoinAsHost && (
              <Button
                size="lg"
                variant="secondary"
                style={touchTargetStyle}
                onClick={handleRejoinAsHost}
                disabled={loading !== null}
              >
                {loading === "rejoinHost" ? "Recreating…" : "Rejoin as host"}
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
              fontSize: theme.fontSize.md,
            }}
          >
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
