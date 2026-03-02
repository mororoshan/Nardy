import { useContext } from "react";
import { NardiGameContext } from "../contexts/NardiGameContext";

export function useNardiGame() {
  const ctx = useContext(NardiGameContext);
  if (!ctx)
    throw new Error("useNardiGame must be used within NardiGameProvider");
  return ctx;
}
