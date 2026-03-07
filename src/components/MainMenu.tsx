import type { CSSProperties } from "react";
import { useState } from "react";
import { theme } from "../theme";
import { getRoomFromUrl } from "../sync/roomUrl";
import { Button } from "./ui";

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
      <Button size="lg" onClick={onSinglePlayer} disabled={loading !== null}>
        Single player
      </Button>
      <Button size="lg" onClick={handleCreate} disabled={loading !== null}>
        {loading === "create" ? "Creating…" : "Create game"}
      </Button>
      <div style={rowStyle}>
        <input
          type="text"
          placeholder="Room code"
          value={joinRoomId}
          onChange={(e) => setJoinRoomId(e.target.value)}
          style={inputStyle}
          disabled={loading !== null}
        />
        <Button size="lg" onClick={handleJoin} disabled={loading !== null}>
          {loading === "join" ? "Joining…" : "Join game"}
        </Button>
      </div>
      {roomInUrl && (
        <Button
          size="lg"
          style={{ backgroundColor: theme.colors.accent }}
          onClick={handleRejoin}
          disabled={loading !== null}
        >
          {loading === "rejoin" ? "Rejoining…" : `Rejoin game (${roomInUrl})`}
        </Button>
      )}
      {error && (
        <p
          style={{
            color: theme.colors.error,
            margin: 0,
            fontSize: theme.fontSize.md,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
