import { useState } from "react";
import { useChatStore } from "../../stores/chatStore";
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

export function QuickChat({ onSend, enabled }: QuickChatProps) {
  const messages = useChatStore((s) => s.messages);
  const addMessage = useChatStore((s) => s.addMessage);
  const [typedMessage, setTypedMessage] = useState("");

  const sendTypedMessage = () => {
    if (!enabled) return;
    const text = typedMessage.trim();
    if (text.length === 0) return;
    addMessage({
      from: "local",
      text,
      timestamp: Date.now(),
      sender: "You",
    });
    onSend(text);
    setTypedMessage("");
  };

  const handlePreset = (text: string) => {
    if (!enabled) return;
    addMessage({
      from: "local",
      text,
      timestamp: Date.now(),
      sender: "You",
    });
    onSend(text);
  };

  const showLog = enabled || messages.length > 0;

  if (!showLog) {
    return (
      <div className="flex flex-col gap-md">
        <p className="text-text-muted text-sm m-0">
          Chat is available in multiplayer games. Start or join a game to send
          quick messages.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-md">
      {!enabled && messages.length > 0 && (
        <div className="p-sm bg-surface-elevated rounded-sm text-xs text-text-muted mb-sm">
          Chat unavailable. You can't send messages until reconnected.
        </div>
      )}
      <div className="flex-1 min-h-[80px] max-h-[160px] overflow-y-auto p-sm bg-surface rounded-sm text-sm">
        {messages.length === 0 ? (
          <p className="text-text-muted italic m-0">No messages yet.</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="mb-xs">
              <span
                className={
                  msg.from === "local"
                    ? "text-accent font-semibold mr-sm"
                    : "text-text-muted font-semibold mr-sm"
                }
              >
                {msg.sender || (msg.from === "local" ? "You" : "Opponent")}:
              </span>
              <span className="text-text">{msg.text}</span>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-sm">
        <input
          type="text"
          value={typedMessage}
          onChange={(e) => setTypedMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              sendTypedMessage();
            }
          }}
          placeholder="Type a message"
          className="flex-1 rounded-sm border border-border bg-surface p-sm text-sm text-text"
          disabled={!enabled}
          maxLength={500}
        />
        <Button
          variant="primary"
          size="sm"
          onClick={sendTypedMessage}
          disabled={!enabled || typedMessage.trim().length === 0}
        >
          Send
        </Button>
      </div>
      <div className="flex flex-wrap gap-sm">
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
