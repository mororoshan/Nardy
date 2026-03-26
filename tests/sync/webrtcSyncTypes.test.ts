import { describe, expect, it } from "vitest";
import {
  parseSyncMessage,
  SyncMessageType,
} from "../../src/sync/webrtcSyncTypes";

describe("webrtcSyncTypes chat_message", () => {
  it("parses a valid chat_message payload", () => {
    const raw = JSON.stringify({
      type: "chat_message",
      text: "hi",
      timestamp: 123,
      sender: "Player 1",
    });

    const parsed = parseSyncMessage(raw);

    expect(parsed).toEqual({
      type: SyncMessageType.Chat,
      text: "hi",
      timestamp: 123,
      sender: "Player 1",
    });
  });

  it("rejects chat_message without sender", () => {
    const raw = JSON.stringify({
      type: "chat_message",
      text: "hi",
      timestamp: 123,
    });

    const parsed = parseSyncMessage(raw);
    expect(parsed).toBeNull();
  });

  it("accepts legacy chat payload and normalizes metadata", () => {
    const raw = JSON.stringify({
      type: "chat",
      text: "legacy hello",
    });

    const parsed = parseSyncMessage(raw);

    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe(SyncMessageType.Chat);
    expect(parsed).toMatchObject({
      type: SyncMessageType.Chat,
      text: "legacy hello",
      sender: "Opponent",
    });
    expect(typeof parsed?.timestamp).toBe("number");
  });
});
