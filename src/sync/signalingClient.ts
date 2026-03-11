/**
 * WebSocket client for WebRTC signaling: create/join rooms and forward SDP/ICE.
 * Protocol: docs/SIGNAL_SERVER_README.md
 * Ranked: queue.join, queue.leave, match.found, game.result (see server agent spec).
 */

/** Payload sent by server when a ranked match is found. */
export interface MatchFoundPayload {
  roomId: string;
  myRole: "creator" | "joiner";
  opponent: { playerId: string; displayName?: string };
}

export interface SignalingCallbacks {
  onCreated?: (roomId: string) => void;
  onJoined?: (roomId: string) => void;
  onPeerJoined?: () => void;
  onSignal?: (data: unknown) => void;
  onPeerLeft?: () => void;
  onError?: (message: string) => void;
  onClose?: () => void;
  /** Ranked: server acknowledged identify; safe to send queue.join. */
  onIdentified?: () => void;
  /** Ranked: server assigned a room and role; client should create or join the room. */
  onMatchFound?: (payload: MatchFoundPayload) => void;
}

export class SignalingClient {
  private ws: WebSocket | null = null;
  private url: string;
  private callbacks: SignalingCallbacks = {};

  constructor(url: string = "ws://localhost:8080") {
    this.url = url;
  }

  setCallbacks(callbacks: SignalingCallbacks): void {
    this.callbacks = callbacks;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }
      try {
        this.ws = new WebSocket(this.url);
      } catch (e) {
        reject(e);
        return;
      }
      this.ws.onopen = () => resolve();
      this.ws.onerror = () => reject(new Error("WebSocket connection failed"));
      this.ws.onmessage = (event) => this.handleMessage(event);
      this.ws.onclose = () => {
        this.ws = null;
        this.callbacks.onClose?.();
      };
    });
  }

  private handleMessage(event: MessageEvent): void {
    let obj: unknown;
    try {
      obj = JSON.parse(event.data as string) as unknown;
    } catch {
      return;
    }
    if (obj === null || typeof obj !== "object") return;
    const o = obj as Record<string, unknown>;
    const type = o.type as string | undefined;
    switch (type) {
      case "created":
        if (typeof o.roomId === "string") this.callbacks.onCreated?.(o.roomId);
        break;
      case "joined":
        if (typeof o.roomId === "string") this.callbacks.onJoined?.(o.roomId);
        break;
      case "peer_joined":
        this.callbacks.onPeerJoined?.();
        break;
      case "signal":
        this.callbacks.onSignal?.(o.data);
        break;
      case "peer_left":
        this.callbacks.onPeerLeft?.();
        break;
      case "error":
        if (typeof o.message === "string") this.callbacks.onError?.(o.message);
        break;
      case "identified":
        this.callbacks.onIdentified?.();
        break;
      case "match.found": {
        const payload = (o.payload as Record<string, unknown> | undefined) ?? o;
        const roomId =
          (typeof payload.roomId === "string" ? payload.roomId : "") ||
          (typeof o.roomId === "string" ? o.roomId : "");
        const opp = (payload.opponent ?? o.opponent) as
          | Record<string, unknown>
          | undefined;
        const opponentPlayerId =
          typeof opp?.playerId === "string" && opp.playerId.length > 0
            ? opp.playerId
            : "";
        if (!roomId || !opponentPlayerId) break;

        const explicitRole =
          o.myRole === "creator" || o.myRole === "joiner"
            ? o.myRole
            : payload.myRole === "creator" || payload.myRole === "joiner"
              ? payload.myRole
              : null;
        const selfObj = payload.self as Record<string, unknown> | undefined;
        const selfId =
          typeof selfObj?.playerId === "string" ? selfObj.playerId : "";
        const myRole: "creator" | "joiner" =
          explicitRole ??
          (selfId && selfId < opponentPlayerId ? "creator" : "joiner");

        this.callbacks.onMatchFound?.({
          roomId,
          myRole,
          opponent: {
            playerId: opponentPlayerId,
            displayName:
              typeof opp?.displayName === "string"
                ? opp.displayName
                : undefined,
          },
        });
        break;
      }
      default:
        break;
    }
  }

  createRoom(roomId?: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const msg =
      roomId != null ? { type: "create", roomId } : { type: "create" };
    this.ws.send(JSON.stringify(msg));
  }

  joinRoom(roomId: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: "join", roomId }));
  }

  sendSignal(data: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: "signal", data }));
  }

  leave(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "leave" }));
    }
  }

  /** Ranked: identify with playerId and displayName. Call before queue.join; wait for onIdentified. */
  identify(playerId: string, displayName?: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const msg: Record<string, unknown> = { type: "identify", playerId };
    if (displayName != null) msg.displayName = displayName;
    this.ws.send(JSON.stringify(msg));
  }

  /** Ranked: join matchmaking queue. mode e.g. "ranked-classic". Call after identify + onIdentified. Sends payload.mode and top-level mode for server compatibility. */
  queueJoin(mode: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        type: "queue.join",
        mode,
        payload: { mode },
      }),
    );
  }

  /** Ranked: leave matchmaking queue. Server accepts optional payload: { mode }. */
  queueLeave(mode?: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const msg: Record<string, unknown> = { type: "queue.leave" };
    if (mode != null) msg.payload = { mode };
    this.ws.send(JSON.stringify(msg));
  }

  /** Ranked: report game result so server can update ELO. */
  sendGameResult(roomId: string, winnerId: string, loserId: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (!winnerId || !loserId || winnerId === loserId) return;
    this.ws.send(
      JSON.stringify({
        type: "game.result",
        roomId,
        winnerId,
        loserId,
        timestamp: Date.now(),
      }),
    );
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.callbacks = {};
  }

  get isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
