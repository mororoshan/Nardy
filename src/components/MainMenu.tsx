import type { CSSProperties } from "react";
import { useState } from "react";
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
  gap: 16,
  padding: 24,
  backgroundColor: "#1a1a2e",
  color: "#e4e4e7",
};

const titleStyle: CSSProperties = {
  fontSize: 28,
  fontWeight: 600,
  marginBottom: 8,
};

const buttonStyle: CSSProperties = {
  padding: "12px 24px",
  fontSize: 16,
  backgroundColor: "#3f3f46",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};

const inputStyle: CSSProperties = {
  padding: "10px 14px",
  fontSize: 16,
  backgroundColor: "#27272a",
  color: "#fff",
  border: "1px solid #52525b",
  borderRadius: 8,
  minWidth: 200,
};

const rowStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
};

export function MainMenu({
  onCreateGame,
  onJoinGame,
  onSinglePlayer,
}: MainMenuProps) {
  const [joinRoomId, setJoinRoomId] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const roomInUrl = getRoomFromUrl();

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
          style={{ ...buttonStyle, backgroundColor: "#4f46e5" }}
          onClick={handleRejoin}
          disabled={loading !== null}
        >
          {loading === "rejoin" ? "Rejoining…" : `Rejoin game (${roomInUrl})`}
        </button>
      )}
      {error && (
        <p style={{ color: "#f87171", margin: 0, fontSize: 14 }}>{error}</p>
      )}
    </div>
  );
}
