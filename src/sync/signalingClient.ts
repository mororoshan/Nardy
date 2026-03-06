/**
 * WebSocket client for WebRTC signaling: create/join rooms and forward SDP/ICE.
 * Protocol: docs/SIGNAL_SERVER_README.md
 */

export interface SignalingCallbacks {
  onCreated?: (roomId: string) => void;
  onJoined?: (roomId: string) => void;
  onPeerJoined?: () => void;
  onSignal?: (data: unknown) => void;
  onPeerLeft?: () => void;
  onError?: (message: string) => void;
  onClose?: () => void;
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
