/**
 * Persist and read room ID in the URL for rejoin (e.g. ?room=abc123).
 */

const ROOM_PARAM = "room";

/**
 * Returns the room ID from the current URL search params, or null if absent.
 */
export function getRoomFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const room = params.get(ROOM_PARAM)?.trim() ?? "";
  return room.length > 0 ? room : null;
}

/**
 * Updates the URL to include ?room=<roomId> (or &room= if other params exist).
 * Uses replaceState so the user can rejoin after refresh or paste link.
 */
export function setRoomInUrl(roomId: string): void {
  if (roomId.trim() === "") return;
  const url = new URL(window.location.href);
  url.searchParams.set(ROOM_PARAM, roomId);
  window.history.replaceState(null, "", url.toString());
}

/**
 * Removes the room param from the URL. Optional when leaving the game
 * (keeping it allows "Rejoin" to appear on the menu).
 */
export function clearRoomFromUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete(ROOM_PARAM);
  window.history.replaceState(null, "", url.toString());
}
