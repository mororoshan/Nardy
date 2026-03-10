/**
 * Chat messages for the game panel. Cleared when leaving the game.
 */

import { create } from "zustand";

export interface ChatMessageEntry {
  id: number;
  from: "local" | "remote";
  text: string;
}

const MAX_MESSAGES = 100;

let nextId = 0;

interface ChatStore {
  messages: ChatMessageEntry[];
  addMessage: (from: "local" | "remote", text: string) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>()((set) => ({
  messages: [],
  addMessage: (from, text) =>
    set((state) => {
      const next = [...state.messages, { id: nextId++, from, text }];
      const messages =
        next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
      return { messages };
    }),
  clearMessages: () => set({ messages: [] }),
}));
