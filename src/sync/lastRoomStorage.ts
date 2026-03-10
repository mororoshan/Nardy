/**
 * Persist last multiplayer room id and role in sessionStorage for peer rejoin
 * (e.g. rejoin from game screen or "Rejoin last game" on menu).
 */

const STORAGE_KEY = "nardi-last-room";

export interface LastRoomInfo {
  roomId: string;
  isCreator: boolean;
}

export function setLastRoom(roomId: string, isCreator: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ roomId: roomId.trim(), isCreator }),
    );
  } catch {
    // ignore storage errors
  }
}

export function getLastRoom(): LastRoomInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (
      data !== null &&
      typeof data === "object" &&
      typeof (data as LastRoomInfo).roomId === "string" &&
      typeof (data as LastRoomInfo).isCreator === "boolean"
    ) {
      const { roomId, isCreator } = data as LastRoomInfo;
      return roomId.length > 0 ? { roomId, isCreator } : null;
    }
  } catch {
    // ignore
  }
  return null;
}

export function clearLastRoom(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
