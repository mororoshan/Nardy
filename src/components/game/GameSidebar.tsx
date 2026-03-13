import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import type { NardiGameSession } from "../../session/gameSessionTypes";
import { getJoinUrl } from "../../sync/roomUrl";
import { useNardiGameStore } from "../../stores/nardiGameStore";
import { Button, TabBar } from "../ui";
import { MoveHistoryList } from "./MoveHistoryList";
import { DiceDisplay } from "./DiceDisplay";
import { GameStatus } from "./GameStatus";
import { QuickChat } from "./QuickChat";

export interface GameSidebarProps {
  session: NardiGameSession;
  onBackToMenu: () => void;
  isNarrow?: boolean;
}

export function GameSidebar({
  session,
  onBackToMenu,
  isNarrow = false,
}: GameSidebarProps) {
  const [activeTab, setActiveTab] = useState<"moves" | "controls" | "chat">(
    "controls",
  );
  const [rejoinLoading, setRejoinLoading] = useState(false);
  const [rejoinError, setRejoinError] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<
    "shared" | "copied" | null
  >(null);
  const shareFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const chatEnabled =
    session.mode === "multiplayer" && session.connectionStatus === "connected";

  const isDisconnected =
    session.mode === "multiplayer" &&
    session.connectionStatus === "disconnected";
  const showRejoin =
    isDisconnected && session.canRejoin && session.onRejoin != null;

  const handleRejoin = async () => {
    if (!session.onRejoin) return;
    setRejoinError(null);
    setRejoinLoading(true);
    try {
      await session.onRejoin();
    } catch (e) {
      setRejoinError(e instanceof Error ? e.message : "Rejoin failed");
    } finally {
      setRejoinLoading(false);
    }
  };

  const handleShareGame = useCallback(async () => {
    if (!session.roomId) return;
    if (shareFeedbackTimeoutRef.current) {
      clearTimeout(shareFeedbackTimeoutRef.current);
      shareFeedbackTimeoutRef.current = null;
    }
    const url = getJoinUrl(session.roomId);
    setShareFeedback(null);
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          url,
          title: "Join Nardi game",
          text: "Join my Nardi game",
        });
        setShareFeedback("shared");
      } else {
        await navigator.clipboard.writeText(url);
        setShareFeedback("copied");
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setShareFeedback("copied");
      } catch {
        setShareFeedback(null);
      }
    }
    shareFeedbackTimeoutRef.current = setTimeout(() => {
      setShareFeedback(null);
      shareFeedbackTimeoutRef.current = null;
    }, 2500);
  }, [session.roomId]);

  useEffect(() => {
    if (!showQr || !session.roomId) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(getJoinUrl(session.roomId), {
      width: 200,
      margin: 1,
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [showQr, session.roomId]);

  useEffect(() => {
    if (!showQr) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowQr(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showQr]);

  const canShare =
    session.mode === "multiplayer" &&
    session.roomId != null &&
    session.connectionStatus === "connected";

  const matchScore = useNardiGameStore((s) => s.matchScore);
  const matchTarget = useNardiGameStore((s) => s.matchTarget);

  const sidebarClasses = isNarrow
    ? "w-full min-w-0 flex-shrink-0 relative z-[1] bg-sidebar-bg border-t border-sidebar-border border-l-0 flex flex-col items-stretch justify-start overflow-auto"
    : "relative z-[1] flex h-full w-[260px] min-w-[260px] flex-col items-stretch justify-center overflow-hidden bg-sidebar-bg border-l border-sidebar-border";

  return (
    <aside className={sidebarClasses}>
      <div className="flex flex-col gap-md border-b border-sidebar-border p-md">
        <p className="text-xs text-text-muted m-0">
          Match: White {matchScore.white} – {matchScore.black} Black
          {matchTarget > 0 ? ` (first to ${matchTarget})` : ""}
        </p>
        <Button
          variant="secondary"
          size="md"
          onClick={onBackToMenu}
          title="Back to menu"
        >
          ← Menu
        </Button>
        {session.connectionStatus !== "disconnected" &&
          session.connectionStatus !== "reconnecting" && (
            <span className="text-xs text-text-muted">
              {session.connectionStatus === "connecting"
                ? "Connecting…"
                : `Connected · ${session.connectionQuality.charAt(0).toUpperCase()}${session.connectionQuality.slice(1)}`}
            </span>
          )}
        {session.connectionStatus === "reconnecting" && (
          <span className="text-xs text-warning">Reconnecting…</span>
        )}
        {isDisconnected && (
          <div className="flex flex-col gap-xs items-start">
            <span className="text-xs text-error">Disconnected</span>
            {showRejoin && (
              <>
                <Button
                  size="sm"
                  onClick={handleRejoin}
                  disabled={rejoinLoading}
                  title="Rejoin the last room"
                >
                  {rejoinLoading ? "Rejoining…" : "Rejoin"}
                </Button>
                {rejoinError && (
                  <span role="alert" className="text-xs text-error">
                    {rejoinError}
                  </span>
                )}
              </>
            )}
          </div>
        )}
        {session.roomId && (
          <div className="flex items-center gap-sm flex-wrap">
            <span className="text-xs text-text-muted">
              Room: <strong className="text-text">{session.roomId}</strong>
            </span>
            <Button size="sm" onClick={session.copyRoomCode}>
              Copy code
            </Button>
          </div>
        )}
        {session.isRankedGame && session.playerRating != null && (
          <p className="m-0 text-xs text-text-muted">
            Rating: {session.playerRating}
          </p>
        )}
        {canShare && (
          <div className="flex items-center gap-sm flex-wrap">
            <Button
              size="sm"
              onClick={handleShareGame}
              title="Share join link (Web Share or copy)"
            >
              {shareFeedback === "shared"
                ? "Shared"
                : shareFeedback === "copied"
                  ? "Link copied"
                  : "Share game"}
            </Button>
            <Button
              size="sm"
              onClick={() => setShowQr(true)}
              title="Show QR code to join"
            >
              Show QR
            </Button>
          </div>
        )}
      </div>
      {showQr && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/60"
          role="dialog"
          aria-modal="true"
          aria-label="QR code to join game"
          onClick={() => setShowQr(false)}
        >
          <div
            className="flex flex-col items-center gap-md p-lg bg-surface rounded-md border border-sidebar-border"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs text-text-muted m-0">Scan to join</span>
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR code: open this link to join the game"
                width={200}
                height={200}
              />
            ) : (
              <span className="text-xs text-text-muted">Generating…</span>
            )}
            <Button size="sm" onClick={() => setShowQr(false)}>
              Close
            </Button>
          </div>
        </div>
      )}
      <div className="flex w-full flex-1 overflow-auto px-md py-md">
        <TabBar
          tabs={[
            { id: "moves", label: "Moves" },
            { id: "controls", label: "Controls" },
            { id: "chat", label: "Chat" },
          ]}
          activeId={activeTab}
          onSelect={(id) => setActiveTab(id as "moves" | "controls" | "chat")}
        >
          {activeTab === "moves" ? (
            <MoveHistoryList />
          ) : activeTab === "chat" ? (
            <QuickChat onSend={session.sendChat} enabled={chatEnabled} />
          ) : (
            <div className="flex flex-col gap-lg">
              <DiceDisplay
                localPlayer={session.localPlayer}
                isMultiplayer={session.mode === "multiplayer"}
                onAfterRoll={session.onAfterRoll}
                onAfterFirstRoll={session.onAfterFirstRoll}
              />
              <GameStatus
                localPlayer={session.localPlayer}
                isMultiplayer={session.mode === "multiplayer"}
                onAfterMove={session.onAfterMove}
                onAfterPass={session.onAfterPass}
              />
            </div>
          )}
        </TabBar>
      </div>
    </aside>
  );
}
