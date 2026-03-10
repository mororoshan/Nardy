/**
 * WebRTC sync: signaling + data channel, explicit send on every move/pass,
 * clear receive handling that sets "my turn" from game state.
 *
 * State ownership: the store (nardiGameStore) is the single source of truth.
 * This hook only pushes remote updates into the store; it does not keep a copy of game state.
 * Reconnection = rejoin (no automatic resume). Conflict model: last message wins per type.
 */

import { useCallback, useRef, useState } from "react";
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
import {
  parseSyncMessage,
  SyncMessageType,
  type MovePayload,
} from "../sync/webrtcSyncTypes";

/** Default: hosted signaling server on Render. Override with VITE_SIGNALING_URL for local dev (e.g. ws://localhost:8080). */
const DEFAULT_SIGNALING_URL = "wss://signal-nardy.onrender.com";
function getSignalingUrl(): string {
  const envUrl = import.meta.env.VITE_SIGNALING_URL;
  if (envUrl && typeof envUrl === "string") return envUrl.replace(/\/$/, "");
  if (typeof window === "undefined") return "ws://localhost:8080";
  return DEFAULT_SIGNALING_URL;
}

/** Connection status for UI. */
export const ConnectionStatus = {
  Disconnected: "disconnected",
  Connecting: "connecting",
  Connected: "connected",
} as const;

export type ConnectionStatusValue =
  (typeof ConnectionStatus)[keyof typeof ConnectionStatus];

/** Re-export for UI components that need to pass move payloads. */
export type { MovePayload } from "../sync/webrtcSyncTypes";

export interface UseWebRtcSyncResult {
  connectionStatus: ConnectionStatusValue;
  roomId: string | null;
  isCreator: boolean | null;
  localPlayer: Player | null;
  createGame: () => Promise<void>;
  joinGame: (roomId: string) => Promise<void>;
  leaveGame: () => void;
  sendDice: (dice: [number, number]) => void;
  sendCurrentState: () => void;
  /** Call with the move that was just applied (one send per move). */
  sendMove: (move: MovePayload) => void;
  /** Call when user ends turn with no legal moves (pass). */
  sendPass: () => void;
  /** Send a quickchat message (multiplayer only; no-op when disconnected). */
  sendChat: (text: string) => void;
}

export function useWebRtcSync(): UseWebRtcSyncResult {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatusValue>(ConnectionStatus.Disconnected);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState<boolean | null>(null);

  const signalingRef = useRef<SignalingClient | null>(null);
  const connectionRef = useRef<WebRtcConnectionHandle | null>(null);
  const isApplyingRemoteRef = useRef(false);
  const hasReceivedStateRef = useRef(false);
  const remotePlayerRef = useRef<Player | null>(null);

  const cleanup = useCallback(() => {
    const conn = connectionRef.current;
    const sig = signalingRef.current;
    connectionRef.current = null;
    signalingRef.current = null;
    conn?.close();
    sig?.leave();
    sig?.close();
    hasReceivedStateRef.current = false;
    setConnectionStatus(ConnectionStatus.Disconnected);
    setRoomId(null);
    setIsCreator(null);
  }, []);

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
      }
    },
    [applyRemoteState, setStoreToMyTurn],
  );

  const createGame = useCallback(async () => {
    cleanup();
    setConnectionStatus(ConnectionStatus.Connecting);
    setIsCreator(true);
    const signaling = new SignalingClient(getSignalingUrl());
    signalingRef.current = signaling;
    try {
      await signaling.connect();
    } catch (e) {
      setConnectionStatus(ConnectionStatus.Disconnected);
      setIsCreator(null);
      throw e;
    }
    signaling.setCallbacks({
      onCreated: (id) => {
        setRoomId(id);
        setRoomInUrl(id);
      },
      onPeerJoined: () => {
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
        conn.onClose(cleanup);
      },
      onSignal: (data) => {
        connectionRef.current?.receiveSignal(data);
      },
      onPeerLeft: cleanup,
      onError: () => {
        cleanup();
      },
      onClose: cleanup,
    });
    signaling.createRoom();
  }, [cleanup, handleMessage]);

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
      conn.onClose(cleanup);
      signaling.setCallbacks({
        onJoined: () => {},
        onSignal: (data) => conn.receiveSignal(data),
        onPeerLeft: cleanup,
        onError: () => {
          cleanup();
        },
        onClose: cleanup,
      });
      signaling.joinRoom(id);
    },
    [cleanup, handleMessage],
  );

  const leaveGame = useCallback(() => {
    cleanup();
  }, [cleanup]);

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

  const localPlayer: Player | null =
    isCreator === true ? "white" : isCreator === false ? "black" : null;

  remotePlayerRef.current =
    isCreator === true ? "black" : isCreator === false ? "white" : null;

  return {
    connectionStatus,
    roomId,
    isCreator,
    localPlayer,
    createGame,
    joinGame,
    leaveGame,
    sendDice,
    sendCurrentState,
    sendMove,
    sendPass,
    sendChat,
  };
}
