import type { CSSProperties } from "react";
import { useChatStore } from "../../stores/chatStore";
import { theme } from "../../theme";
import { Button } from "../ui";

/** Preset quickchat messages. */
const QUICKCHAT_PRESETS: string[] = [
  "Good luck!",
  "Good game",
  "Thanks",
  "Oops",
  "Nice move",
  "Thinking…",
];

export interface QuickChatProps {
  /** Send a message (no-op in local). */
  onSend: (text: string) => void;
  /** Whether chat is available (multiplayer and connected). */
  enabled: boolean;
}

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing.md,
};

const logStyle: CSSProperties = {
  flex: 1,
  minHeight: 80,
  maxHeight: 160,
  overflowY: "auto",
  padding: theme.spacing.sm,
  backgroundColor: theme.colors.surface,
  borderRadius: theme.borderRadius.sm,
  fontSize: theme.fontSize.sm,
};

const messageRowStyle: CSSProperties = {
  marginBottom: theme.spacing.xs,
};

const localLabelStyle: CSSProperties = {
  color: theme.colors.accent,
  fontWeight: 600,
  marginRight: theme.spacing.sm,
};

const remoteLabelStyle: CSSProperties = {
  color: theme.colors.textMuted,
  fontWeight: 600,
  marginRight: theme.spacing.sm,
};

const presetsStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: theme.spacing.sm,
};

const emptyLogStyle: CSSProperties = {
  color: theme.colors.textMuted,
  fontStyle: "italic",
};

const disabledHintStyle: CSSProperties = {
  color: theme.colors.textMuted,
  fontSize: theme.fontSize.sm,
  margin: 0,
};

const bannerStyle: CSSProperties = {
  padding: theme.spacing.sm,
  backgroundColor: theme.colors.surfaceElevated,
  borderRadius: theme.borderRadius.sm,
  fontSize: theme.fontSize.xs,
  color: theme.colors.textMuted,
  marginBottom: theme.spacing.sm,
};

export function QuickChat({ onSend, enabled }: QuickChatProps) {
  const messages = useChatStore((s) => s.messages);
  const addMessage = useChatStore((s) => s.addMessage);

  const handlePreset = (text: string) => {
    if (!enabled) return;
    addMessage("local", text);
    onSend(text);
  };

  const showLog = enabled || messages.length > 0;

  if (!showLog) {
    return (
      <div style={containerStyle}>
        <p style={disabledHintStyle}>
          Chat is available in multiplayer games. Start or join a game to send
          quick messages.
        </p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {!enabled && messages.length > 0 && (
        <div style={bannerStyle}>
          Chat unavailable. You can’t send messages until reconnected.
        </div>
      )}
      <div style={logStyle}>
        {messages.length === 0 ? (
          <p style={emptyLogStyle}>No messages yet.</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} style={messageRowStyle}>
              <span
                style={
                  msg.from === "local" ? localLabelStyle : remoteLabelStyle
                }
              >
                {msg.from === "local" ? "You" : "Opponent"}:
              </span>
              <span style={{ color: theme.colors.text }}>{msg.text}</span>
            </div>
          ))
        )}
      </div>
      <div style={presetsStyle}>
        {QUICKCHAT_PRESETS.map((text) => (
          <Button
            key={text}
            variant="secondary"
            size="sm"
            onClick={() => handlePreset(text)}
            disabled={!enabled}
          >
            {text}
          </Button>
        ))}
      </div>
    </div>
  );
}
