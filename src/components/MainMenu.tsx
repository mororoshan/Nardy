import { useEffect, useState } from "react";
import { getRoomFromUrl } from "../sync/roomUrl";
import { getDisplayName, setDisplayName } from "../sync/playerIdentity";
import type { LeaderboardEntry } from "../sync/signalingClient";
import { Button } from "./ui";
import {
  getSignalingErrorDisplayMessage,
  type QueueStatus,
  type LastSignalingError,
} from "../hooks/useWebRtcSync";

export interface MainMenuProps {
  onCreateGame: () => Promise<void>;
  onJoinGame: (roomId: string) => Promise<void>;
  /** Ranked matchmaking: join queue and wait for match. */
  onPlayRanked?: () => Promise<void>;
  /** Cancel ranked queue search. */
  onCancelRanked?: () => void;
  /** "searching" while in ranked queue. */
  queueStatus?: QueueStatus;
  /** Last ranked/signaling error (e.g. queue.not_identified). Shown with code-based message when set. */
  rankedError?: LastSignalingError | null;
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
  /** When true, expand the leaderboard section (e.g. after sign-in). */
  forceExpandLeaderboard?: boolean;
  /** Called when leaderboard has been expanded (reset force). */
  onLeaderboardExpanded?: () => void;
  /** Show Sign out when signed in. */
  onSignOut?: () => void;
  /** True when user is signed in (show Sign out). */
  isSignedIn?: boolean;
}

export function MainMenu({
  onCreateGame,
  onJoinGame,
  onPlayRanked,
  onCancelRanked,
  queueStatus = "idle",
  rankedError = null,
  onRejoinAsHost,
  onSinglePlayer,
  onTwoPlayers,
  touchFriendly = false,
  playerRating = null,
  onOpenLeaderboard,
  leaderboardEntries = null,
  leaderboardError = null,
  leaderboardLoading = false,
  forceExpandLeaderboard = false,
  onLeaderboardExpanded,
  onSignOut,
  isSignedIn = false,
}: MainMenuProps) {
  const roomInUrl = getRoomFromUrl();
  const [joinRoomId, setJoinRoomId] = useState(roomInUrl ?? "");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaderboardExpanded, setLeaderboardExpanded] = useState(false);
  const [casualDisplayName, setCasualDisplayName] = useState(() =>
    getDisplayName(),
  );

  useEffect(() => {
    setCasualDisplayName(getDisplayName());
  }, []);

  useEffect(() => {
    if (forceExpandLeaderboard) {
      setLeaderboardExpanded(true);
      onLeaderboardExpanded?.();
    }
  }, [forceExpandLeaderboard, onLeaderboardExpanded]);
  const searching = queueStatus === "searching";
  const rankedErrorMessage = getSignalingErrorDisplayMessage(
    rankedError ?? null,
  );
  const isNarrow = touchFriendly;

  const touchClass = touchFriendly ? "min-h-[44px]" : "";
  const inputClasses = [
    "py-2.5 px-3.5 text-lg bg-menu-input-bg text-text border border-menu-gold rounded-md min-w-[200px]",
    touchFriendly && "min-h-[44px]",
  ]
    .filter(Boolean)
    .join(" ");

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

  const menuBtnClass = (extra = "") =>
    [touchClass, extra].filter(Boolean).join(" ");

  return (
    <main
      className="min-h-screen w-full flex items-center justify-center p-lg text-text"
      style={{
        backgroundImage: "url(/assets/main_bg.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="bg-menu-overlay rounded-[16px] border-[3px] border-menu-wood-border outline outline-1 outline-menu-gold outline-offset-2 p-[48px] max-w-[560px] w-full shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <h1 className="text-menu-gold text-[32px] font-semibold font-[Georgia,serif] m-0 mb-xl text-center">
          Backgammon
        </h1>
        <div
          className={`flex flex-row gap-xl items-start ${
            isNarrow ? "flex-col" : ""
          }`}
        >
          <section
            aria-labelledby="play-heading"
            className="flex-1 min-w-0 flex flex-col items-center gap-lg"
          >
            <h2
              id="play-heading"
              className="text-sm font-semibold text-menu-gold uppercase tracking-wider m-0 mb-xs pb-xs border-b border-menu-gold w-full text-center"
            >
              PLAY
            </h2>
            <Button
              variant="menu"
              size="lg"
              onClick={onSinglePlayer}
              disabled={loading !== null}
              className={menuBtnClass()}
              title="Play vs computer (you are White)"
            >
              Vs bot
            </Button>
            <Button
              variant="menu"
              size="lg"
              onClick={onTwoPlayers}
              disabled={loading !== null}
              className={menuBtnClass()}
              title="Two players on this device (pass and play)"
            >
              Two players
            </Button>
          </section>

          <section
            aria-labelledby="connect-heading"
            className={`flex-1 min-w-0 flex flex-col items-center gap-lg ${
              isNarrow ? "!gap-xl" : ""
            }`}
          >
            <h2
              id="connect-heading"
              className="text-sm font-semibold text-menu-gold uppercase tracking-wider m-0 mb-xs pb-xs border-b border-menu-gold w-full text-center"
            >
              CONNECT
            </h2>
            {isSignedIn && onSignOut && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSignOut}
                className="text-menu-gold-muted text-sm"
              >
                Sign out
              </Button>
            )}
            {onPlayRanked && (
              <>
                <Button
                  variant="menu"
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
                  className={menuBtnClass(
                    searching ? "!bg-surface-elevated" : "",
                  )}
                >
                  {searching
                    ? "Searching for match…"
                    : loading === "ranked"
                      ? "Joining…"
                      : "Play ranked"}
                </Button>
                {playerRating != null && (
                  <p className="m-0 text-sm text-menu-gold-muted">
                    Your rating: {playerRating}
                  </p>
                )}
                {rankedErrorMessage && (
                  <p role="alert" className="m-0 text-sm text-error">
                    {rankedErrorMessage}
                  </p>
                )}
                {searching && onCancelRanked && (
                  <Button
                    variant="menu"
                    size="lg"
                    onClick={onCancelRanked}
                    className={menuBtnClass()}
                  >
                    Cancel
                  </Button>
                )}
              </>
            )}
            {onOpenLeaderboard && (
              <div
                className="flex flex-col gap-sm items-center"
                role="group"
                aria-label="Leaderboard"
              >
                <Button
                  variant="menu"
                  size="lg"
                  onClick={() => {
                    setLeaderboardExpanded(true);
                    onOpenLeaderboard?.();
                  }}
                  disabled={leaderboardLoading || loading !== null}
                  className={menuBtnClass()}
                  title={
                    leaderboardExpanded
                      ? "Leaderboard (shown)"
                      : "Show leaderboard"
                  }
                >
                  {leaderboardLoading ? "Loading…" : "Leaderboard"}
                </Button>
                {leaderboardError && (
                  <p role="alert" className="m-0 text-sm text-error">
                    {leaderboardError}
                  </p>
                )}
                {leaderboardExpanded &&
                  !leaderboardLoading &&
                  leaderboardEntries != null && (
                    <div className="w-full max-w-[320px] max-h-[240px] overflow-auto text-sm bg-menu-input-bg border border-menu-gold rounded-md p-sm">
                      <table
                        className="w-full border-collapse"
                        aria-label="Leaderboard"
                      >
                        <thead>
                          <tr>
                            <th className="text-left p-xs text-menu-gold-muted">
                              Rank
                            </th>
                            <th className="text-left p-xs text-menu-gold-muted">
                              Name
                            </th>
                            <th className="text-right p-xs text-menu-gold-muted">
                              Rating
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaderboardEntries.map((entry) => (
                            <tr key={entry.playerId}>
                              <td className="p-xs">{entry.rank}</td>
                              <td className="p-xs">
                                {entry.displayName || entry.playerId}
                              </td>
                              <td className="p-xs text-right">
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
            <div className="flex flex-col gap-xs w-full max-w-[280px]">
              <label
                htmlFor="casual-name"
                className="text-sm text-menu-gold-muted"
              >
                Your name (for casual games)
              </label>
              <input
                id="casual-name"
                type="text"
                aria-label="Your name for casual games"
                value={casualDisplayName}
                onChange={(e) => {
                  const v = e.target.value.trim().slice(0, 32);
                  setCasualDisplayName(v || "Player");
                  setDisplayName(v || "Player");
                }}
                onBlur={() =>
                  setDisplayName(casualDisplayName.trim() || "Player")
                }
                className={inputClasses}
                disabled={loading !== null}
              />
            </div>
            <Button
              variant="menu"
              size="lg"
              onClick={handleCreate}
              disabled={loading !== null || searching}
              className={menuBtnClass()}
            >
              {loading === "create" ? "Creating…" : "Create game"}
            </Button>
            <div className="flex gap-sm items-center flex-wrap justify-center">
              <input
                type="text"
                aria-label="Room code"
                placeholder="Room code"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                className={inputClasses}
                disabled={loading !== null}
              />
              <Button
                variant="menu"
                size="lg"
                onClick={handleJoin}
                disabled={loading !== null}
                className={menuBtnClass()}
              >
                {loading === "join" ? "Joining…" : "Join game"}
              </Button>
            </div>
            {roomInUrl && (
              <div className="flex flex-col gap-sm items-center">
                <Button
                  variant="menuRejoin"
                  size="lg"
                  onClick={handleRejoin}
                  disabled={loading !== null}
                  className={menuBtnClass()}
                >
                  {loading === "rejoin"
                    ? "Rejoining…"
                    : `Rejoin (${roomInUrl})`}
                </Button>
                {onRejoinAsHost && (
                  <Button
                    variant="menu"
                    size="lg"
                    onClick={handleRejoinAsHost}
                    disabled={loading !== null}
                    className={menuBtnClass()}
                  >
                    {loading === "rejoinHost"
                      ? "Recreating…"
                      : "Rejoin as host"}
                  </Button>
                )}
              </div>
            )}
            {error && (
              <p role="alert" className="text-error m-0 text-sm">
                {error}
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
