/**
 * Player identity for ranked matchmaking.
 * playerId is stored in sessionStorage so each tab/session has a unique ID
 * (enables testing with 2 tabs; guarantees uniqueness per session).
 * displayName can be changed by the user and persists in localStorage.
 */

const PLAYER_ID_KEY = "nardi-player-id";
const DISPLAY_NAME_KEY = "nardi-display-name";
const DEFAULT_DISPLAY_NAME = "Player";

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Returns a session-scoped player ID (creates and stores one if missing). Unique per tab. */
export function getOrCreatePlayerId(): string {
  if (typeof window === "undefined") return generateId();
  try {
    let id = sessionStorage.getItem(PLAYER_ID_KEY);
    if (!id || id.length < 5) {
      id = generateId();
      sessionStorage.setItem(PLAYER_ID_KEY, id);
    }
    return id;
  } catch {
    return generateId();
  }
}

/** Returns the display name for ranked (default "Player"). */
export function getDisplayName(): string {
  if (typeof window === "undefined") return DEFAULT_DISPLAY_NAME;
  try {
    const name = localStorage.getItem(DISPLAY_NAME_KEY);
    return name && name.trim().length > 0
      ? name.trim().slice(0, 32)
      : DEFAULT_DISPLAY_NAME;
  } catch {
    return DEFAULT_DISPLAY_NAME;
  }
}

/** Saves display name for future sessions. */
export function setDisplayName(name: string): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = name.trim().slice(0, 32);
    localStorage.setItem(DISPLAY_NAME_KEY, trimmed || DEFAULT_DISPLAY_NAME);
  } catch {
    // ignore
  }
}
