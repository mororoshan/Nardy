import type { NardiGameContextValue } from "../contexts/nardiGameContextValue";
import { useNardiGameStore } from "../stores/nardiGameStore";

export function useNardiGame(): NardiGameContextValue {
  return useNardiGameStore();
}
