/**
 * Chat messages for the game panel. Cleared when leaving the game.
 */

import { create } from "zustand";

export interface ChatMessageEntry {
  id: number;
  from: "local" | "remote";
  text: string;
  timestamp: number;
  sender: string;
}

const MAX_MESSAGES = 100;

let nextId = 0;

interface ChatStore {
  messages: ChatMessageEntry[];
  addMessage: (message: Omit<ChatMessageEntry, "id">) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>()((set) => ({
  messages: [],
  addMessage: (message) =>
    set((state) => {
      const next = [...state.messages, { id: nextId++, ...message }];
      const messages =
        next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
      return { messages };
    }),
  clearMessages: () => set({ messages: [] }),
}));
