import type { CSSProperties } from "react";
import { useState } from "react";
import { theme } from "../theme";
import { getRoomFromUrl } from "../sync/roomUrl";

export interface MainMenuProps {
  onCreateGame: () => Promise<void>;
  onJoinGame: (roomId: string) => Promise<void>;
  onSinglePlayer: () => void;
}

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  gap: theme.spacing.lg,
  padding: theme.spacing.xl,
  backgroundColor: theme.colors.background,
  color: theme.colors.text,
};

const titleStyle: CSSProperties = {
  fontSize: 28,
  fontWeight: 600,
  marginBottom: theme.spacing.sm,
};

const buttonStyle: CSSProperties = {
  padding: "12px 24px",
  fontSize: theme.fontSize.lg,
  backgroundColor: theme.colors.surfaceElevated,
  color: "#fff",
  border: "none",
  borderRadius: theme.borderRadius.md,
  cursor: "pointer",
};

const inputStyle: CSSProperties = {
  padding: "10px 14px",
  fontSize: theme.fontSize.lg,
  backgroundColor: theme.colors.surface,
  color: "#fff",
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadius.md,
  minWidth: 200,
};

const rowStyle: CSSProperties = {
  display: "flex",
  gap: theme.spacing.sm,
  alignItems: "center",
};

export function MainMenu({
  onCreateGame,
  onJoinGame,
  onSinglePlayer,
}: MainMenuProps) {
  const roomInUrl = getRoomFromUrl();
  const [joinRoomId, setJoinRoomId] = useState(roomInUrl ?? "");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>Nardi</h1>
      <button
        type="button"
        style={buttonStyle}
        onClick={onSinglePlayer}
        disabled={loading !== null}
      >
        Single player
      </button>
      <button
        type="button"
        style={buttonStyle}
        onClick={handleCreate}
        disabled={loading !== null}
      >
        {loading === "create" ? "Creating…" : "Create game"}
      </button>
      <div style={rowStyle}>
        <input
          type="text"
          placeholder="Room code"
          value={joinRoomId}
          onChange={(e) => setJoinRoomId(e.target.value)}
          style={inputStyle}
          disabled={loading !== null}
        />
        <button
          type="button"
          style={buttonStyle}
          onClick={handleJoin}
          disabled={loading !== null}
        >
          {loading === "join" ? "Joining…" : "Join game"}
        </button>
      </div>
      {roomInUrl && (
        <button
          type="button"
          style={{ ...buttonStyle, backgroundColor: theme.colors.accent }}
          onClick={handleRejoin}
          disabled={loading !== null}
        >
          {loading === "rejoin" ? "Rejoining…" : `Rejoin game (${roomInUrl})`}
        </button>
      )}
      {error && (
        <p style={{ color: theme.colors.error, margin: 0, fontSize: theme.fontSize.md }}>
          {error}
        </p>
      )}
    </div>
  );
}
