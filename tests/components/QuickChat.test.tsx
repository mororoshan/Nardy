import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuickChat } from "../../src/components/game/QuickChat";
import { useChatStore } from "../../src/stores/chatStore";

describe("QuickChat", () => {
  beforeEach(() => {
    useChatStore.getState().clearMessages();
  });

  it("sends typed message on Enter and shows it", () => {
    const onSend = vi.fn();
    render(<QuickChat onSend={onSend} enabled={true} />);

    const input = screen.getByPlaceholderText("Type a message");
    fireEvent.change(input, { target: { value: "hello there" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSend).toHaveBeenCalledWith("hello there");
    expect(screen.getByText("hello there")).toBeTruthy();
  });

  it("sends typed message on button click", () => {
    const onSend = vi.fn();
    render(<QuickChat onSend={onSend} enabled={true} />);

    const input = screen.getByPlaceholderText("Type a message");
    fireEvent.change(input, { target: { value: "from button" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(onSend).toHaveBeenCalledWith("from button");
    expect(screen.getByText("from button")).toBeTruthy();
  });

  it("shows sender name for remote messages", () => {
    useChatStore.getState().addMessage({
      from: "remote",
      text: "remote says hi",
      timestamp: Date.now(),
      sender: "Rival",
    });
    const onSend = vi.fn();
    render(<QuickChat onSend={onSend} enabled={true} />);

    expect(screen.getByText("Rival:")).toBeTruthy();
    expect(screen.getByText("remote says hi")).toBeTruthy();
  });
});
