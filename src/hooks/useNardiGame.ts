import type { NardiGameContextValue } from "../contexts/nardiGameContextValue";
import { useNardiGameStore } from "../stores/nardiGameStore";

/**
 * Game state and actions. Implemented by the Zustand store; no React Context provider.
 */
export function useNardiGame(): NardiGameContextValue {
  return useNardiGameStore();
}
