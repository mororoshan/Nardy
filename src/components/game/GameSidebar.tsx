import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import type { NardiGameSession } from "../../session/gameSessionTypes";
import { getJoinUrl } from "../../sync/roomUrl";
import { theme } from "../../theme";
import { Button, TabBar } from "../ui";
import { MoveHistoryList } from "./MoveHistoryList";
import { DiceDisplay } from "./DiceDisplay";
import { GameStatus } from "./GameStatus";
import { QuickChat } from "./QuickChat";

const SIDEBAR_WIDTH = 300;

export interface GameSidebarProps {
  session: NardiGameSession;
  onBackToMenu: () => void;
  isNarrow?: boolean;
}

const sidebarStyle: CSSProperties = {
  width: SIDEBAR_WIDTH,
  minWidth: SIDEBAR_WIDTH,
  position: "relative",
  zIndex: 1,
  backgroundColor: theme.colors.sidebarBg,
  borderLeft: `1px solid ${theme.colors.sidebarBorder}`,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
};

const sidebarStyleNarrow: CSSProperties = {
  width: "100%",
  minWidth: 0,
  flexShrink: 0,
  position: "relative",
  zIndex: 1,
  backgroundColor: theme.colors.sidebarBg,
  borderTop: `1px solid ${theme.colors.sidebarBorder}`,
  borderLeft: "none",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-start",
  overflow: "auto",
};

const headerStyle: CSSProperties = {
  padding: theme.spacing.md,
  borderBottom: `1px solid ${theme.colors.sidebarBorder}`,
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing.sm,
};

const connectionStyle: CSSProperties = {
  fontSize: theme.fontSize.xs,
  color: theme.colors.textMuted,
};

const roomRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: theme.spacing.sm,
  flexWrap: "wrap",
};

const roomLabelStyle: CSSProperties = {
  fontSize: theme.fontSize.xs,
  color: theme.colors.textMuted,
};

const disconnectedRowStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing.xs,
  alignItems: "flex-start",
};

const shareRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: theme.spacing.sm,
  flexWrap: "wrap",
};

const qrOverlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  zIndex: 100,
};

const qrCardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: theme.spacing.md,
  padding: theme.spacing.lg,
  backgroundColor: theme.colors.surface,
  borderRadius: theme.borderRadius.md,
  border: `1px solid ${theme.colors.sidebarBorder}`,
};

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

  return (
    <aside style={isNarrow ? sidebarStyleNarrow : sidebarStyle}>
      <div style={headerStyle}>
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
            <span style={connectionStyle}>
              {session.connectionStatus === "connecting"
                ? "Connecting…"
                : `Connected · ${session.connectionQuality.charAt(0).toUpperCase()}${session.connectionQuality.slice(1)}`}
            </span>
          )}
        {session.connectionStatus === "reconnecting" && (
          <span style={{ ...connectionStyle, color: theme.colors.warning }}>
            Reconnecting…
          </span>
        )}
        {isDisconnected && (
          <div style={disconnectedRowStyle}>
            <span style={{ ...connectionStyle, color: theme.colors.error }}>
              Disconnected
            </span>
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
                  <span
                    role="alert"
                    style={{
                      fontSize: theme.fontSize.xs,
                      color: theme.colors.error,
                    }}
                  >
                    {rejoinError}
                  </span>
                )}
              </>
            )}
          </div>
        )}
        {session.roomId && (
          <div style={roomRowStyle}>
            <span style={roomLabelStyle}>
              Room:{" "}
              <strong style={{ color: theme.colors.text }}>
                {session.roomId}
              </strong>
            </span>
            <Button size="sm" onClick={session.copyRoomCode}>
              Copy code
            </Button>
          </div>
        )}
        {canShare && (
          <div style={shareRowStyle}>
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
          style={qrOverlayStyle}
          role="dialog"
          aria-modal="true"
          aria-label="QR code to join game"
          onClick={() => setShowQr(false)}
        >
          <div style={qrCardStyle} onClick={(e) => e.stopPropagation()}>
            <span style={{ ...roomLabelStyle, margin: 0 }}>Scan to join</span>
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR code: open this link to join the game"
                width={200}
                height={200}
              />
            ) : (
              <span style={connectionStyle}>Generating…</span>
            )}
            <Button size="sm" onClick={() => setShowQr(false)}>
              Close
            </Button>
          </div>
        </div>
      )}
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
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: theme.spacing.lg,
            }}
          >
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
    </aside>
  );
}
