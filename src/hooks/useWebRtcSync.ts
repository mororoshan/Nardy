/**
 * WebRTC sync: signaling + data channel, explicit send on every move/pass,
 * clear receive handling that sets "my turn" from game state.
 *
 * State ownership: the store (nardiGameStore) is the single source of truth.
 * This hook only pushes remote updates into the store; it does not keep a copy of game state.
 * Reconnection = rejoin (no automatic resume). Conflict model: last message wins per type.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Player } from "../game/direction";
import {
  createInitialState,
  applyMove,
  type NardiState,
} from "../game/nardiState";
import {
  useNardiGameStore,
  type GameHistoryEntry,
} from "../stores/nardiGameStore";
import { useChatStore } from "../stores/chatStore";
import { SignalingClient } from "../sync/signalingClient";
import {
  createOfferer,
  createAnswerer,
  type WebRtcConnectionHandle,
} from "../sync/webrtcConnection";
import { setRoomInUrl } from "../sync/roomUrl";
import { setLastRoom, getLastRoom } from "../sync/lastRoomStorage";
import { getOrCreatePlayerId, getDisplayName } from "../sync/playerIdentity";
import { useAuth } from "../contexts/AuthContext";
import type {
  IdentifiedPayload,
  LeaderboardEntry,
  MatchFoundPayload,
} from "../sync/signalingClient";
import {
  parseSyncMessage,
  SyncMessageType,
  type MovePayload,
} from "../sync/webrtcSyncTypes";

/** Ranked matchmaking queue mode (server must support this mode). */
export const RANKED_QUEUE_MODE = "ranked-classic";

/** Default: hosted signaling server on Render. Override with VITE_SIGNALING_URL for local dev (e.g. ws://localhost:8080). */
const DEFAULT_SIGNALING_URL = "wss://signal-nardy.onrender.com";
function getSignalingUrl(): string {
  const envUrl = import.meta.env.VITE_SIGNALING_URL;
  if (envUrl && typeof envUrl === "string") return envUrl.replace(/\/$/, "");
  if (typeof window === "undefined") return "ws://localhost:8080";
  return DEFAULT_SIGNALING_URL;
}

const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000, 16000, 30000];
const MAX_RECONNECT_ATTEMPTS = RECONNECT_DELAYS_MS.length;

/** Connection status for UI. */
export const ConnectionStatus = {
  Disconnected: "disconnected",
  Connecting: "connecting",
  Connected: "connected",
  Reconnecting: "reconnecting",
} as const;

export type ConnectionStatusValue =
  (typeof ConnectionStatus)[keyof typeof ConnectionStatus];

/** Re-export for UI components that need to pass move payloads. */
export type { MovePayload } from "../sync/webrtcSyncTypes";

/** Connection quality from getStats (when connected). */
export const ConnectionQuality = {
  Excellent: "excellent",
  Good: "good",
  Poor: "poor",
  Offline: "offline",
} as const;

export type ConnectionQualityValue =
  (typeof ConnectionQuality)[keyof typeof ConnectionQuality];

/** Ranked match info stored when match.found is received (for reporting game.result). */
export interface RankedMatchInfo {
  opponentPlayerId: string;
  whitePlayerId: string;
  blackPlayerId: string;
}

/** Last error from signaling in ranked flow (e.g. queue.not_identified). */
export interface LastSignalingError {
  message: string;
  code?: string;
}

/** Known error codes → short user-facing message. Falls back to message when code unknown. */
const SIGNALING_ERROR_MESSAGES: Record<string, string> = {
  "identify.invalid": "Invalid player ID",
  "queue.not_identified": "Identify first",
  "queue.invalid_mode": "Invalid queue mode",
  "queue.already_in_room": "Already in a room",
  "join.identify_required": "Identify first to rejoin",
  "game_result.invalid": "Invalid game result",
  "game_result.unknown_room": "Game already ended",
  "leaderboard.not_identified": "Identify first to view leaderboard",
  "identify.error": "Server error (identify)",
  "queue.error": "Server error (queue)",
  "game_result.error": "Server error (recording result)",
  "leaderboard.error": "Server error (leaderboard)",
};

export function getSignalingErrorDisplayMessage(
  err: LastSignalingError | null,
): string | null {
  if (!err) return null;
  if (err.code && SIGNALING_ERROR_MESSAGES[err.code])
    return SIGNALING_ERROR_MESSAGES[err.code];
  return err.message;
}

export type QueueStatus = "idle" | "searching";

export interface UseWebRtcSyncResult {
  connectionStatus: ConnectionStatusValue;
  /** When connected, derived from WebRTC stats; otherwise Offline. */
  connectionQuality: ConnectionQualityValue;
  roomId: string | null;
  isCreator: boolean | null;
  localPlayer: Player | null;
  /** Ranked: "searching" while in queue, "idle" otherwise. */
  queueStatus: QueueStatus;
  /** True when current game was started via ranked matchmaking (report result on game over). */
  isRankedGame: boolean;
  createGame: (roomId?: string) => Promise<void>;
  joinGame: (roomId: string) => Promise<void>;
  /** Ranked: join matchmaking queue; on match.found we enter the room. */
  joinRankedQueue: () => Promise<void>;
  /** Ranked: leave queue (no-op if already in a game). */
  leaveRankedQueue: () => void;
  leaveGame: () => void;
  /** Rejoin the last room (creator re-creates, joiner joins). Throws if no previous room in storage. */
  rejoinFromLastRoom: () => Promise<void>;
  /** True when sessionStorage has a last room (e.g. after disconnect). */
  canRejoin: boolean;
  /** Ranked: ELO rating from server (identified payload); null until identified or after cleanup. */
  playerRating: number | null;
  /** Ranked: fetch leaderboard (opens temp connection: identify → requestLeaderboard → close). */
  fetchLeaderboard: (limit?: number, offset?: number) => Promise<void>;
  /** Leaderboard entries from last successful fetch; null until loaded or on error. */
  leaderboardEntries: LeaderboardEntry[] | null;
  /** Error message from last leaderboard fetch; null when not fetched or success. */
  leaderboardError: string | null;
  /** True while a leaderboard fetch is in progress. */
  leaderboardLoading: boolean;
  /** Last error from signaling in ranked flow (e.g. queue.not_identified); null when cleared or on success. */
  lastSignalingError: LastSignalingError | null;
  /** Casual: display name of the other peer (from peer_joined); null until received or in ranked. */
  remotePeerDisplayName: string | null;
  /** Ranked: call when game ends so server can update ELO. Reported once per ranked session (first game). No-op if not ranked or already reported. */
  reportGameResult: (winner: Player) => void;
  sendDice: (dice: [number, number]) => void;
  sendCurrentState: () => void;
  /** Call with the move that was just applied (one send per move). */
  sendMove: (move: MovePayload) => void;
  /** Call when user ends turn with no legal moves (pass). */
  sendPass: () => void;
  /** Send a quickchat message (multiplayer only; no-op when disconnected). */
  sendChat: (text: string) => void;
  /** Send next game (keep score) or new match (reset score) to peer. */
  sendNewGame: (resetMatchScore: boolean) => void;
}

export function useWebRtcSync(): UseWebRtcSyncResult {
  const { session, user } = useAuth();
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatusValue>(ConnectionStatus.Disconnected);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState<boolean | null>(null);
  const [remotePeerDisplayName, setRemotePeerDisplayName] = useState<
    string | null
  >(null);

  const [connectionQuality, setConnectionQuality] =
    useState<ConnectionQualityValue>(ConnectionQuality.Offline);
  const [queueStatus, setQueueStatus] = useState<QueueStatus>("idle");
  const [isRankedGame, setIsRankedGame] = useState(false);
  const [playerRating, setPlayerRating] = useState<number | null>(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState<
    LeaderboardEntry[] | null
  >(null);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [lastSignalingError, setLastSignalingError] =
    useState<LastSignalingError | null>(null);

  const signalingRef = useRef<SignalingClient | null>(null);
  const connectionRef = useRef<WebRtcConnectionHandle | null>(null);
  const isApplyingRemoteRef = useRef(false);
  const hasReceivedStateRef = useRef(false);
  const remotePlayerRef = useRef<Player | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const isCreatorRef = useRef<boolean | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const reconnectAttemptRef = useRef(0);
  /** When true, signaling onClose must not run full cleanup (we're scheduling reconnect). */
  const reconnectingRef = useRef(false);
  /** Set when match.found; used to send game.result and derive isRankedGame. Cleared after report. */
  const rankedMatchInfoRef = useRef<RankedMatchInfo | null>(null);
  /** Avoid sending game.result more than once per game. */
  const gameResultReportedRef = useRef(false);
  /** Used by fetchLeaderboard to avoid setState after unmount. */
  const mountedRef = useRef(true);
  roomIdRef.current = roomId;
  isCreatorRef.current = isCreator;

  const cleanup = useCallback(() => {
    reconnectingRef.current = false;
    rankedMatchInfoRef.current = null;
    gameResultReportedRef.current = false;
    setRemotePeerDisplayName(null);
    setQueueStatus("idle");
    setIsRankedGame(false);
    setPlayerRating(null);
    const lastId = roomIdRef.current;
    const lastCreator = isCreatorRef.current;
    if (lastId != null && lastCreator != null) {
      setLastRoom(lastId, lastCreator);
    }
    if (reconnectTimeoutRef.current != null) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttemptRef.current = 0;
    const conn = connectionRef.current;
    const sig = signalingRef.current;
    connectionRef.current = null;
    signalingRef.current = null;
    conn?.close();
    sig?.leave();
    sig?.close();
    hasReceivedStateRef.current = false;
    setConnectionStatus(ConnectionStatus.Disconnected);
    setConnectionQuality(ConnectionQuality.Offline);
    setRoomId(null);
    setIsCreator(null);
  }, []);

  const createGameRef = useRef<(roomId?: string) => Promise<void>>(() =>
    Promise.resolve(),
  );
  const joinGameRef = useRef<(id: string) => Promise<void>>(() =>
    Promise.resolve(),
  );

  const scheduleReconnect = useCallback(
    (savedRoomId: string, savedIsCreator: boolean) => {
      const attempt = reconnectAttemptRef.current;
      if (attempt >= MAX_RECONNECT_ATTEMPTS) return;
      const delay =
        RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)];
      reconnectTimeoutRef.current = setTimeout(async () => {
        reconnectTimeoutRef.current = null;
        try {
          if (savedIsCreator) {
            await createGameRef.current(savedRoomId);
          } else {
            await joinGameRef.current(savedRoomId);
          }
          reconnectAttemptRef.current = 0;
        } catch {
          reconnectAttemptRef.current = attempt + 1;
          scheduleReconnect(savedRoomId, savedIsCreator);
        }
      }, delay);
    },
    [],
  );

  const applyRemoteState = useCallback((state: NardiState) => {
    isApplyingRemoteRef.current = true;
    useNardiGameStore.setState({
      state,
      selectedPoint: null,
      gameHistory: [],
    });
    isApplyingRemoteRef.current = false;
    hasReceivedStateRef.current = true;
  }, []);

  const setStoreToMyTurn = useCallback(
    (next: NardiState, appendHistory?: GameHistoryEntry) => {
      isApplyingRemoteRef.current = true;
      if (appendHistory) {
        const { gameHistory } = useNardiGameStore.getState();
        useNardiGameStore.setState({
          state: next,
          selectedPoint: null,
          gameHistory: [...gameHistory, appendHistory],
        });
      } else {
        useNardiGameStore.setState({ state: next, selectedPoint: null });
      }
      isApplyingRemoteRef.current = false;
    },
    [],
  );

  const handleMessage = useCallback(
    (raw: string) => {
      const msg = parseSyncMessage(raw);
      if (!msg) return;

      if (msg.type === SyncMessageType.State) {
        applyRemoteState(msg.state);
        return;
      }

      if (msg.type === SyncMessageType.Move) {
        const { state: prevState } = useNardiGameStore.getState();
        let state = prevState;
        const remotePlayer = remotePlayerRef.current;
        if (remotePlayer !== null && state.turn !== remotePlayer) {
          state = { ...state, turn: remotePlayer };
        }
        const next = applyMove(
          state,
          msg.from,
          msg.to,
          msg.usedDiceIndices as [number, number],
        );
        const entry: GameHistoryEntry | undefined =
          msg.isLastMoveOfTurn && state.dice !== null
            ? {
                turn: state.turn,
                dice: state.dice,
                moves: [
                  ...state.movesThisTurn,
                  {
                    from: msg.from,
                    to: msg.to,
                    usedDiceIndices: msg.usedDiceIndices,
                  },
                ],
              }
            : undefined;
        setStoreToMyTurn(next, entry);
        useNardiGameStore.getState().setLastMove(msg.from, msg.to, state.turn);
        return;
      }

      if (msg.type === SyncMessageType.RequestState) {
        const conn = connectionRef.current;
        if (conn) {
          const state = useNardiGameStore.getState().state;
          conn.send({ type: SyncMessageType.State, state });
        }
        return;
      }

      if (msg.type === SyncMessageType.Dice) {
        const state = useNardiGameStore.getState().state;
        const next = { ...state, dice: msg.dice };
        isApplyingRemoteRef.current = true;
        useNardiGameStore.setState({ state: next });
        isApplyingRemoteRef.current = false;
        return;
      }

      if (msg.type === SyncMessageType.Chat) {
        useChatStore.getState().addMessage("remote", msg.text);
        return;
      }

      if (msg.type === SyncMessageType.Pass) {
        const { state } = useNardiGameStore.getState();
        const remotePlayer = remotePlayerRef.current;
        if (remotePlayer === null) return;
        const entry: GameHistoryEntry =
          state.dice !== null
            ? { turn: remotePlayer, dice: state.dice, moves: [] }
            : { turn: remotePlayer, dice: [0, 0], moves: [] };
        if (state.turn !== remotePlayer) {
          const forced = { ...state, turn: remotePlayer };
          const next: NardiState = {
            ...forced,
            dice: null,
            usedDice: [false, false],
            movesThisTurn: [],
            turn: forced.turn === "white" ? "black" : "white",
          };
          setStoreToMyTurn(next, entry);
        } else {
          const next: NardiState = {
            ...state,
            dice: null,
            usedDice: [false, false],
            movesThisTurn: [],
            turn: state.turn === "white" ? "black" : "white",
          };
          setStoreToMyTurn(next, entry);
        }
        return;
      }

      if (msg.type === SyncMessageType.NewGame) {
        if (msg.resetMatchScore) {
          useNardiGameStore.getState().newGame();
        } else {
          useNardiGameStore.getState().nextGame();
        }
      }
    },
    [applyRemoteState, setStoreToMyTurn],
  );

  const createGame = useCallback(
    async (rejoinRoomId?: string) => {
      cleanup();
      setConnectionStatus(ConnectionStatus.Connecting);
      setIsCreator(true);
      if (rejoinRoomId != null && rejoinRoomId.trim() !== "") {
        setRoomId(rejoinRoomId.trim());
        setRoomInUrl(rejoinRoomId.trim());
      }
      const signaling = new SignalingClient(getSignalingUrl());
      signalingRef.current = signaling;
      try {
        await signaling.connect();
      } catch (e) {
        setConnectionStatus(ConnectionStatus.Disconnected);
        setIsCreator(null);
        setRoomId(null);
        throw e;
      }
      signaling.setCallbacks({
        onCreated: (id) => {
          setRoomId(id);
          setRoomInUrl(id);
        },
        onPeerJoined: (payload) => {
          setRemotePeerDisplayName(payload?.displayName ?? null);
          const sendSignal = (data: unknown) =>
            signalingRef.current?.sendSignal(data);
          const conn = createOfferer(sendSignal);
          connectionRef.current = conn;
          conn.onOpen(() => {
            setConnectionStatus(ConnectionStatus.Connected);
            const current = useNardiGameStore.getState().state;
            const isFresh =
              current.phase === "firstRoll" &&
              current.firstRollDice.white === null &&
              current.firstRollDice.black === null;
            const state = isFresh
              ? createInitialState()
              : useNardiGameStore.getState().state;
            if (isFresh)
              useNardiGameStore.setState({ state, selectedPoint: null });
            conn.send({ type: SyncMessageType.State, state });
          });
          conn.onMessage((s) => handleMessage(s));
          conn.onClose(() => {
            const rid = roomIdRef.current;
            const creator = isCreatorRef.current;
            if (rid == null || creator == null) {
              cleanup();
              return;
            }
            reconnectingRef.current = true;
            const connToClose = connectionRef.current;
            const sigToClose = signalingRef.current;
            connectionRef.current = null;
            signalingRef.current = null;
            connToClose?.close();
            sigToClose?.leave();
            sigToClose?.close();
            hasReceivedStateRef.current = false;
            setConnectionStatus(ConnectionStatus.Reconnecting);
            setConnectionQuality(ConnectionQuality.Offline);
            setRoomId(rid);
            setIsCreator(creator);
            if (reconnectTimeoutRef.current != null) {
              clearTimeout(reconnectTimeoutRef.current);
              reconnectTimeoutRef.current = null;
            }
            scheduleReconnect(rid, creator);
          });
        },
        onSignal: (data) => {
          connectionRef.current?.receiveSignal(data);
        },
        onPeerLeft: cleanup,
        onError: () => {
          cleanup();
        },
        onClose: () => {
          if (reconnectingRef.current) return;
          cleanup();
        },
      });
      signaling.createRoom(
        rejoinRoomId?.trim() || undefined,
        getDisplayName() || undefined,
      );
    },
    [cleanup, handleMessage, scheduleReconnect],
  );

  const joinGame = useCallback(
    async (id: string) => {
      cleanup();
      setConnectionStatus(ConnectionStatus.Connecting);
      setIsCreator(false);
      setRoomId(id);
      setRoomInUrl(id);
      const signaling = new SignalingClient(getSignalingUrl());
      signalingRef.current = signaling;
      try {
        await signaling.connect();
      } catch (e) {
        setConnectionStatus(ConnectionStatus.Disconnected);
        setIsCreator(null);
        setRoomId(null);
        throw e;
      }
      const sendSignal = (data: unknown) =>
        signalingRef.current?.sendSignal(data);
      const conn = createAnswerer(sendSignal);
      connectionRef.current = conn;
      conn.onOpen(() => {
        setConnectionStatus(ConnectionStatus.Connected);
        conn.send({ type: SyncMessageType.RequestState });
      });
      conn.onMessage((s) => handleMessage(s));
      conn.onClose(() => {
        const rid = roomIdRef.current;
        const creator = isCreatorRef.current;
        if (rid == null || creator == null) {
          cleanup();
          return;
        }
        reconnectingRef.current = true;
        const connToClose = connectionRef.current;
        const sigToClose = signalingRef.current;
        connectionRef.current = null;
        signalingRef.current = null;
        connToClose?.close();
        sigToClose?.leave();
        sigToClose?.close();
        hasReceivedStateRef.current = false;
        setConnectionStatus(ConnectionStatus.Reconnecting);
        setConnectionQuality(ConnectionQuality.Offline);
        setRoomId(rid);
        setIsCreator(creator);
        if (reconnectTimeoutRef.current != null) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        scheduleReconnect(rid, creator);
      });
      signaling.setCallbacks({
        onJoined: () => {},
        onSignal: (data) => conn.receiveSignal(data),
        onPeerLeft: cleanup,
        onError: () => {
          cleanup();
        },
        onClose: () => {
          if (reconnectingRef.current) return;
          cleanup();
        },
      });
      signaling.joinRoom(id, getDisplayName() || undefined);
    },
    [cleanup, handleMessage, scheduleReconnect],
  );

  const setupRoomAfterMatchFound = useCallback(
    (payload: MatchFoundPayload) => {
      const ourId = payload.self?.playerId ?? getOrCreatePlayerId();
      const oppId = payload.opponent.playerId || "";
      const startId = payload.startingPlayerId;
      const whitePlayerId =
        startId != null && startId.length > 0
          ? startId === ourId
            ? ourId
            : oppId
          : payload.myRole === "creator"
            ? ourId
            : oppId;
      const blackPlayerId = whitePlayerId === ourId ? oppId : ourId;
      rankedMatchInfoRef.current = {
        opponentPlayerId: oppId,
        whitePlayerId,
        blackPlayerId,
      };
      setQueueStatus("idle");
      setIsRankedGame(true);
      setRoomId(payload.roomId);
      setRoomInUrl(payload.roomId);
      setIsCreator(payload.myRole === "creator");

      const signaling = signalingRef.current;
      if (!signaling) return;

      // Per SIGNALING_API: after match.found both peers are already in the room;
      // do not send create or join. Set up WebRTC (offer/answer) and signal callbacks only.
      const sendSignal = (data: unknown) =>
        signalingRef.current?.sendSignal(data);

      if (payload.myRole === "creator") {
        const conn = createOfferer(sendSignal);
        connectionRef.current = conn;
        conn.onOpen(() => {
          setConnectionStatus(ConnectionStatus.Connected);
          const current = useNardiGameStore.getState().state;
          const isFresh =
            current.phase === "firstRoll" &&
            current.firstRollDice.white === null &&
            current.firstRollDice.black === null;
          const state = isFresh
            ? createInitialState()
            : useNardiGameStore.getState().state;
          if (isFresh)
            useNardiGameStore.setState({ state, selectedPoint: null });
          conn.send({ type: SyncMessageType.State, state });
        });
        conn.onMessage((s) => handleMessage(s));
        conn.onClose(() => {
          const rid = roomIdRef.current;
          const creator = isCreatorRef.current;
          if (rid == null || creator == null) {
            cleanup();
            return;
          }
          reconnectingRef.current = true;
          const connToClose = connectionRef.current;
          const sigToClose = signalingRef.current;
          connectionRef.current = null;
          signalingRef.current = null;
          connToClose?.close();
          sigToClose?.leave();
          sigToClose?.close();
          hasReceivedStateRef.current = false;
          setConnectionStatus(ConnectionStatus.Reconnecting);
          setConnectionQuality(ConnectionQuality.Offline);
          setRoomId(rid);
          setIsCreator(creator);
          if (reconnectTimeoutRef.current != null) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
          scheduleReconnect(rid, creator);
        });
        signaling.setCallbacks({
          onSignal: (data) => connectionRef.current?.receiveSignal(data),
          onPeerLeft: cleanup,
          onError: () => cleanup(),
          onGameResultAck: () => {},
          onClose: () => {
            if (reconnectingRef.current) return;
            cleanup();
          },
        });
      } else {
        const conn = createAnswerer(sendSignal);
        connectionRef.current = conn;
        conn.onOpen(() => {
          setConnectionStatus(ConnectionStatus.Connected);
          conn.send({ type: SyncMessageType.RequestState });
        });
        conn.onMessage((s) => handleMessage(s));
        conn.onClose(() => {
          const rid = roomIdRef.current;
          const creator = isCreatorRef.current;
          if (rid == null || creator == null) {
            cleanup();
            return;
          }
          reconnectingRef.current = true;
          const connToClose = connectionRef.current;
          const sigToClose = signalingRef.current;
          connectionRef.current = null;
          signalingRef.current = null;
          connToClose?.close();
          sigToClose?.leave();
          sigToClose?.close();
          hasReceivedStateRef.current = false;
          setConnectionStatus(ConnectionStatus.Reconnecting);
          setConnectionQuality(ConnectionQuality.Offline);
          setRoomId(rid);
          setIsCreator(creator);
          if (reconnectTimeoutRef.current != null) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
          scheduleReconnect(rid, creator);
        });
        signaling.setCallbacks({
          onSignal: (data) => conn.receiveSignal(data),
          onPeerLeft: cleanup,
          onError: () => cleanup(),
          onGameResultAck: () => {},
          onClose: () => {
            if (reconnectingRef.current) return;
            cleanup();
          },
        });
      }
    },
    [cleanup, handleMessage, scheduleReconnect],
  );

  const joinRankedQueue = useCallback(async () => {
    cleanup();
    setLastSignalingError(null);
    setConnectionStatus(ConnectionStatus.Connecting);
    setQueueStatus("searching");
    const signaling = new SignalingClient(getSignalingUrl());
    signalingRef.current = signaling;
    try {
      await signaling.connect();
    } catch (e) {
      setConnectionStatus(ConnectionStatus.Disconnected);
      setQueueStatus("idle");
      throw e;
    }
    const accessToken = session?.access_token ?? "";
    const displayName =
      ((user?.user_metadata as Record<string, unknown> | undefined)
        ?.display_name as string | undefined) ??
      user?.email ??
      "Player";
    signaling.setCallbacks({
      onIdentified: (payload: IdentifiedPayload) => {
        setPlayerRating(payload.rating);
        setLastSignalingError(null);
        signaling.queueJoin(RANKED_QUEUE_MODE);
      },
      onQueueStatus: (_mode, status) => {
        if (status === "left") setQueueStatus("idle");
        if (status === "joined") setQueueStatus("searching");
      },
      onMatchFound: (payload) => setupRoomAfterMatchFound(payload),
      onError: (message: string, code?: string) => {
        setLastSignalingError({ message, code });
        setQueueStatus("idle");
        cleanup();
      },
      onClose: () => {
        setQueueStatus("idle");
        cleanup();
      },
    });
    signaling.identify(accessToken, displayName);
  }, [cleanup, setupRoomAfterMatchFound, session?.access_token, user]);

  const leaveRankedQueue = useCallback(() => {
    if (queueStatus === "searching") {
      signalingRef.current?.queueLeave(RANKED_QUEUE_MODE);
    }
    cleanup();
  }, [cleanup, queueStatus]);

  const fetchLeaderboard = useCallback(
    async (limit?: number, offset?: number) => {
      setLeaderboardLoading(true);
      setLeaderboardError(null);
      setLeaderboardEntries(null);

      const client = new SignalingClient(getSignalingUrl());
      try {
        await client.connect();
      } catch {
        if (mountedRef.current) {
          setLeaderboardError("Failed to connect to server");
          setLeaderboardLoading(false);
        }
        return;
      }

      const accessToken = session?.access_token ?? "";
      const displayName =
        ((user?.user_metadata as Record<string, unknown> | undefined)
          ?.display_name as string | undefined) ??
        user?.email ??
        "Player";
      client.setCallbacks({
        onIdentified: () => {
          client.requestLeaderboard(limit ?? 50, offset ?? 0);
        },
        onLeaderboard: (payload) => {
          if (mountedRef.current) {
            setLeaderboardEntries([...payload.entries]);
            setLeaderboardLoading(false);
          }
          client.close();
        },
        onError: (message: string) => {
          if (mountedRef.current) {
            setLeaderboardError(message || "Failed to load leaderboard");
            setLeaderboardLoading(false);
          }
          client.close();
        },
        onClose: () => {
          if (mountedRef.current) setLeaderboardLoading(false);
        },
      });

      client.identify(accessToken, displayName);
    },
    [session?.access_token, user],
  );

  const reportGameResult = useCallback((winner: Player) => {
    if (gameResultReportedRef.current) return;
    const info = rankedMatchInfoRef.current;
    const rid = roomIdRef.current;
    if (!info || !rid) return;
    const winnerId =
      winner === "white" ? info.whitePlayerId : info.blackPlayerId;
    const loserId =
      winner === "white" ? info.blackPlayerId : info.whitePlayerId;
    signalingRef.current?.sendGameResult(
      rid,
      winnerId,
      loserId,
      RANKED_QUEUE_MODE,
    );
    gameResultReportedRef.current = true;
    rankedMatchInfoRef.current = null;
  }, []);

  useEffect(() => {
    createGameRef.current = createGame;
    joinGameRef.current = joinGame;
  }, [createGame, joinGame]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current != null) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, []);

  const leaveGame = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const rejoinFromLastRoom = useCallback(async () => {
    const last = getLastRoom();
    if (!last) {
      throw new Error("No previous room to rejoin");
    }
    if (last.isCreator) {
      await createGame(last.roomId);
    } else {
      await joinGame(last.roomId);
    }
  }, [createGame, joinGame]);

  const sendDice = useCallback((dice: [number, number]) => {
    const conn = connectionRef.current;
    if (conn) conn.send({ type: SyncMessageType.Dice, dice });
  }, []);

  const sendCurrentState = useCallback(() => {
    const conn = connectionRef.current;
    const state = useNardiGameStore.getState().state;
    if (conn) conn.send({ type: SyncMessageType.State, state });
  }, []);

  const sendMove = useCallback((move: MovePayload) => {
    const conn = connectionRef.current;
    if (!conn) return;
    conn.send({
      type: SyncMessageType.Move,
      from: move.from,
      to: move.to,
      usedDiceIndices: move.usedDiceIndices,
      isLastMoveOfTurn: move.isLastMoveOfTurn,
    });
  }, []);

  const sendPass = useCallback(() => {
    const conn = connectionRef.current;
    if (conn) conn.send({ type: SyncMessageType.Pass });
  }, []);

  const sendChat = useCallback((text: string) => {
    const conn = connectionRef.current;
    if (conn) conn.send({ type: SyncMessageType.Chat, text });
  }, []);

  const sendNewGame = useCallback((resetMatchScore: boolean) => {
    const conn = connectionRef.current;
    if (conn)
      conn.send({
        type: SyncMessageType.NewGame,
        resetMatchScore,
      });
  }, []);

  const localPlayer: Player | null =
    isCreator === true ? "white" : isCreator === false ? "black" : null;

  remotePlayerRef.current =
    isCreator === true ? "black" : isCreator === false ? "white" : null;

  const canRejoin = getLastRoom() !== null;

  useEffect(() => {
    if (connectionStatus !== ConnectionStatus.Connected) return;
    const pc = connectionRef.current?.getPeerConnection();
    if (!pc) return;

    const poll = async () => {
      try {
        const report = await pc.getStats();
        let rttMs: number | null = null;
        report.forEach((stat) => {
          if (
            stat.type === "candidate-pair" &&
            "currentRoundTripTime" in stat &&
            typeof (stat as RTCIceCandidatePairStats).currentRoundTripTime ===
              "number"
          ) {
            const rtt = (stat as RTCIceCandidatePairStats).currentRoundTripTime;
            if (typeof rtt === "number" && rtt > 0) rttMs = rtt * 1000;
          }
        });
        if (rttMs != null) {
          if (rttMs < 100) setConnectionQuality(ConnectionQuality.Excellent);
          else if (rttMs < 200) setConnectionQuality(ConnectionQuality.Good);
          else setConnectionQuality(ConnectionQuality.Poor);
        } else {
          setConnectionQuality(ConnectionQuality.Good);
        }
      } catch {
        setConnectionQuality(ConnectionQuality.Poor);
      }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [connectionStatus]);

  return {
    connectionStatus,
    connectionQuality,
    roomId,
    isCreator,
    localPlayer,
    queueStatus,
    isRankedGame,
    playerRating,
    fetchLeaderboard,
    leaderboardEntries,
    leaderboardError,
    leaderboardLoading,
    lastSignalingError,
    remotePeerDisplayName,
    createGame,
    joinGame,
    joinRankedQueue,
    leaveRankedQueue,
    leaveGame,
    rejoinFromLastRoom,
    canRejoin,
    reportGameResult,
    sendDice,
    sendCurrentState,
    sendMove,
    sendPass,
    sendChat,
    sendNewGame,
  };
}
