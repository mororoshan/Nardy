/**
 * WebRTC data channel message types for Nardi state sync.
 */

import { applyMove, type NardiState } from "../game/nardiState";

/** Message type discriminator for sync channel. */
export const SyncMessageType = {
  State: "state",
  Move: "move",
  Dice: "dice",
  Pass: "pass",
  RequestState: "request_state",
  Chat: "chat",
  NewGame: "new_game",
} as const;

export type SyncMessageTypeValue =
  (typeof SyncMessageType)[keyof typeof SyncMessageType];

/** Payload for a single move (used when sending and in MoveMessage). */
export interface MovePayload {
  from: number;
  to: number;
  usedDiceIndices: [number, number];
  /** True when this move uses all dice and ends the sender's turn. */
  isLastMoveOfTurn: boolean;
}

/**
 * Build a MovePayload for a given move. Use when sending a move over sync
 * so UI and sync share one place for "isLastMoveOfTurn" logic.
 */
export function buildMovePayload(
  state: NardiState,
  from: number,
  to: number,
  usedDiceIndices: [number, number],
): MovePayload {
  const next = applyMove(state, from, to, usedDiceIndices);
  return {
    from,
    to,
    usedDiceIndices,
    isLastMoveOfTurn: next.dice === null,
  };
}

export interface StateMessage {
  type: typeof SyncMessageType.State;
  state: NardiState;
}

export interface MoveMessage extends MovePayload {
  type: typeof SyncMessageType.Move;
}

export interface DiceMessage {
  type: typeof SyncMessageType.Dice;
  dice: [number, number];
}

/** Sent when the sender ends their turn with no legal moves (pass). */
export interface PassMessage {
  type: typeof SyncMessageType.Pass;
}

/** Sent by joiner when channel opens to request full state from peer. */
export interface RequestStateMessage {
  type: typeof SyncMessageType.RequestState;
}

/** Sent when a peer wants to start next game (keep score) or new match (reset score). */
export interface NewGameMessage {
  type: typeof SyncMessageType.NewGame;
  /** If true, reset match score; if false, keep score (next game in match). */
  resetMatchScore: boolean;
}

/** Max length for quickchat text over the data channel. */
const MAX_CHAT_LENGTH = 500;

/** Quickchat text sent over the data channel. */
export interface ChatMessage {
  type: typeof SyncMessageType.Chat;
  text: string;
}

export type SyncMessage =
  | StateMessage
  | MoveMessage
  | DiceMessage
  | PassMessage
  | RequestStateMessage
  | ChatMessage
  | NewGameMessage;

/** State payload is trusted from the peer; no structural NardiState validation. */
function isStateMessage(o: unknown): o is StateMessage {
  if (o === null || typeof o !== "object") return false;
  const obj = o as Record<string, unknown>;
  if (obj.type !== SyncMessageType.State) return false;
  return typeof obj.state === "object" && obj.state !== null;
}

function isMoveMessage(o: unknown): o is MoveMessage {
  if (o === null || typeof o !== "object") return false;
  const obj = o as Record<string, unknown>;
  if (obj.type !== SyncMessageType.Move) return false;
  const indices = obj.usedDiceIndices as unknown[];
  return (
    typeof obj.from === "number" &&
    typeof obj.to === "number" &&
    Array.isArray(obj.usedDiceIndices) &&
    indices.length === 2 &&
    typeof indices[0] === "number" &&
    typeof indices[1] === "number" &&
    (obj.isLastMoveOfTurn === undefined ||
      typeof obj.isLastMoveOfTurn === "boolean")
  );
}

function isDiceMessage(o: unknown): o is DiceMessage {
  if (o === null || typeof o !== "object") return false;
  const obj = o as Record<string, unknown>;
  if (obj.type !== SyncMessageType.Dice) return false;
  const dice = obj.dice as unknown[];
  return (
    Array.isArray(obj.dice) &&
    dice.length === 2 &&
    typeof dice[0] === "number" &&
    typeof dice[1] === "number"
  );
}

function isPassMessage(o: unknown): o is PassMessage {
  if (o === null || typeof o !== "object") return false;
  const obj = o as Record<string, unknown>;
  return obj.type === SyncMessageType.Pass;
}

function isRequestStateMessage(o: unknown): o is RequestStateMessage {
  if (o === null || typeof o !== "object") return false;
  const obj = o as Record<string, unknown>;
  return obj.type === SyncMessageType.RequestState;
}

function isNewGameMessage(o: unknown): o is NewGameMessage {
  if (o === null || typeof o !== "object") return false;
  const obj = o as Record<string, unknown>;
  return (
    obj.type === SyncMessageType.NewGame &&
    typeof obj.resetMatchScore === "boolean"
  );
}

function isChatMessage(o: unknown): o is ChatMessage {
  if (o === null || typeof o !== "object") return false;
  const obj = o as Record<string, unknown>;
  return (
    obj.type === SyncMessageType.Chat &&
    typeof obj.text === "string" &&
    (obj.text as string).length <= MAX_CHAT_LENGTH
  );
}

/**
 * Parse and validate a sync message from the data channel. Returns null if invalid.
 */
export function parseSyncMessage(raw: string): SyncMessage | null {
  let obj: unknown;
  try {
    obj = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (isStateMessage(obj)) return obj;
  if (isMoveMessage(obj))
    return {
      type: SyncMessageType.Move,
      from: obj.from,
      to: obj.to,
      usedDiceIndices: [obj.usedDiceIndices[0], obj.usedDiceIndices[1]],
      isLastMoveOfTurn: obj.isLastMoveOfTurn === true,
    };
  if (isDiceMessage(obj))
    return {
      type: SyncMessageType.Dice,
      dice: [obj.dice[0], obj.dice[1]],
    };
  if (isPassMessage(obj)) return { type: SyncMessageType.Pass };
  if (isRequestStateMessage(obj)) return { type: SyncMessageType.RequestState };
  if (isNewGameMessage(obj))
    return {
      type: SyncMessageType.NewGame,
      resetMatchScore: obj.resetMatchScore,
    };
  if (isChatMessage(obj))
    return {
      type: SyncMessageType.Chat,
      text: String(obj.text).slice(0, MAX_CHAT_LENGTH),
    };
  return null;
}
