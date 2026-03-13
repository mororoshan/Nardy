/**
 * WebSocket client for WebRTC signaling: create/join rooms and forward SDP/ICE.
 * Protocol: docs/SIGNALING_API.md
 * Ranked: queue.join, queue.leave, match.found, game.result (see server agent spec).
 */

/** Payload sent by server after successful identify (see SIGNALING_API.md). */
export interface IdentifiedPayload {
  playerId: string;
  displayName?: string;
  /** ELO rating from DB (e.g. 1200 for new players). */
  rating: number;
}

/** One entry in leaderboard response. */
export interface LeaderboardEntry {
  playerId: string;
  displayName: string;
  rating: number;
  rank: number;
}

/** Payload of server leaderboard response. */
export interface LeaderboardPayload {
  entries: LeaderboardEntry[];
}

/** Payload sent by server when a ranked match is found. */
export interface MatchFoundPayload {
  roomId: string;
  myRole: "creator" | "joiner";
  opponent: { playerId: string; displayName?: string };
  /** Authority for who starts the game (first mover). If set, use this instead of myRole for white/black. */
  startingPlayerId?: string;
}

export interface SignalingCallbacks {
  onCreated?: (roomId: string) => void;
  onJoined?: (roomId: string) => void;
  onPeerJoined?: () => void;
  onSignal?: (data: unknown) => void;
  onPeerLeft?: () => void;
  onError?: (message: string, code?: string) => void;
  onClose?: () => void;
  /** Ranked: server acknowledged identify; safe to send queue.join. */
  onIdentified?: (payload: IdentifiedPayload) => void;
  /** Ranked: server assigned a room and role; both peers are already in the room—set up WebRTC only, do not send create/join. */
  onMatchFound?: (payload: MatchFoundPayload) => void;
  /** Ranked: leaderboard response after leaderboard request. */
  onLeaderboard?: (payload: LeaderboardPayload) => void;
  /** Ranked: queue status after queue.join or queue.leave. */
  onQueueStatus?: (mode: string | undefined, status: "joined" | "left") => void;
  /** Ranked: server acknowledged game.result. */
  onGameResultAck?: (roomId: string) => void;
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
      case "error": {
        if (typeof o.message !== "string") break;
        const payload = o.payload as Record<string, unknown> | undefined;
        const code =
          typeof payload?.code === "string" ? payload.code : undefined;
        this.callbacks.onError?.(o.message, code);
        break;
      }
      case "identified": {
        const playerId =
          typeof o.playerId === "string" && o.playerId.length > 0
            ? o.playerId
            : "";
        if (playerId === "") break;
        const displayName =
          typeof o.displayName === "string" ? o.displayName : undefined;
        const rawRating = o.rating;
        const rating =
          typeof rawRating === "number" && Number.isFinite(rawRating)
            ? rawRating
            : 1200;
        this.callbacks.onIdentified?.({ playerId, displayName, rating });
        break;
      }
      case "leaderboard": {
        const payload = o.payload as Record<string, unknown> | undefined;
        const rawEntries = payload?.entries;
        if (!Array.isArray(rawEntries)) break;
        const entries: LeaderboardEntry[] = [];
        for (const item of rawEntries) {
          if (item === null || typeof item !== "object") continue;
          const e = item as Record<string, unknown>;
          const pid = typeof e.playerId === "string" ? e.playerId : "";
          const dname = typeof e.displayName === "string" ? e.displayName : "";
          const r =
            typeof e.rating === "number" && Number.isFinite(e.rating)
              ? e.rating
              : 0;
          const rank =
            typeof e.rank === "number" &&
            Number.isInteger(e.rank) &&
            e.rank >= 0
              ? e.rank
              : 0;
          entries.push({
            playerId: pid,
            displayName: dname,
            rating: r,
            rank,
          });
        }
        this.callbacks.onLeaderboard?.({ entries });
        break;
      }
      case "queue.status": {
        const payload = o.payload as Record<string, unknown> | undefined;
        const status = payload?.status;
        if (status === "joined" || status === "left") {
          const mode =
            typeof payload?.mode === "string" ? payload.mode : undefined;
          this.callbacks.onQueueStatus?.(mode, status);
        }
        break;
      }
      case "game.result.ack": {
        const payload = o.payload as Record<string, unknown> | undefined;
        const roomId =
          (typeof payload?.roomId === "string" ? payload.roomId : null) ??
          (typeof o.roomId === "string" ? o.roomId : null);
        if (roomId && roomId.length > 0)
          this.callbacks.onGameResultAck?.(roomId);
        break;
      }
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

        const gameObj = payload.game as Record<string, unknown> | undefined;
        const startingPlayerId =
          typeof gameObj?.startingPlayerId === "string"
            ? gameObj.startingPlayerId
            : undefined;

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
          startingPlayerId,
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

  /** Request leaderboard (requires prior identify). limit 1–100, default 50; offset for pagination. */
  requestLeaderboard(limit: number = 50, offset: number = 0): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const lim = Math.max(1, Math.min(100, Math.floor(limit)));
    const off = Math.max(0, Math.floor(offset));
    this.ws.send(
      JSON.stringify({
        type: "leaderboard",
        payload: { limit: lim, offset: off },
      }),
    );
  }

  /** Ranked: report game result so server can update ELO. Payload shape per SIGNALING_API. */
  sendGameResult(
    roomId: string,
    winnerId: string,
    loserId: string,
    mode: string = "ranked-classic",
  ): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (!winnerId || !loserId || winnerId === loserId) return;
    this.ws.send(
      JSON.stringify({
        type: "game.result",
        payload: { roomId, winnerId, loserId, mode },
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
