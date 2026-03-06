/**
 * WebRTC peer connection and data channel for Nardi sync.
 * Exchanges SDP/ICE via a callback (signaling layer sends over WebSocket).
 */

const DATA_CHANNEL_LABEL = "nardi-sync";
const STUN_SERVER = "stun:stun.l.google.com:19302";

export interface WebRtcConnectionHandle {
  receiveSignal(data: unknown): void;
  send(data: string | object): void;
  onMessage(cb: (data: string) => void): void;
  onOpen(cb: () => void): void;
  onClose(cb: () => void): void;
  close(): void;
}

function createPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection({
    iceServers: [{ urls: STUN_SERVER }],
  });
}

function isIceCandidate(obj: unknown): obj is RTCIceCandidateInit {
  if (obj === null || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return typeof o.candidate === "string" || o.candidate === undefined;
}

function isSessionDescription(obj: unknown): obj is RTCSessionDescriptionInit {
  if (obj === null || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    (o.type === "offer" || o.type === "answer") && typeof o.sdp === "string"
  );
}

export function createOfferer(
  sendSignal: (data: unknown) => void,
): WebRtcConnectionHandle {
  const pc = createPeerConnection();
  const dataChannel = pc.createDataChannel(DATA_CHANNEL_LABEL, {
    ordered: true,
  });
  const messageListeners: Array<(data: string) => void> = [];
  const openListeners: Array<() => void> = [];
  const closeListeners: Array<() => void> = [];

  let isClosed = false;

  dataChannel.onmessage = (event) => {
    const s = typeof event.data === "string" ? event.data : "";
    messageListeners.forEach((cb) => cb(s));
  };
  dataChannel.onopen = () => openListeners.forEach((cb) => cb());
  dataChannel.onclose = () => closeListeners.forEach((cb) => cb());

  pc.onicecandidate = (event) => {
    if (event.candidate && !isClosed) sendSignal(event.candidate.toJSON());
  };

  const runOffer = async (): Promise<void> => {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    if (pc.localDescription && !isClosed) sendSignal(pc.localDescription);
  };
  runOffer().catch(() => {
    if (!isClosed) closeListeners.forEach((cb) => cb());
  });

  return {
    receiveSignal(data: unknown): void {
      if (isClosed) return;
      if (isSessionDescription(data)) {
        pc.setRemoteDescription(new RTCSessionDescription(data)).catch(
          () => {},
        );
        return;
      }
      if (isIceCandidate(data)) {
        pc.addIceCandidate(new RTCIceCandidate(data)).catch(() => {});
      }
    },
    send(data: string | object): void {
      if (dataChannel.readyState !== "open") {
        console.log(
          "[WebRTC connection] offerer send skipped (channel not open)",
          {
            state: dataChannel.readyState,
            type:
              typeof data === "object" && data !== null && "type" in data
                ? (data as { type: string }).type
                : "?",
          },
        );
        return;
      }
      const s = typeof data === "string" ? data : JSON.stringify(data);
      dataChannel.send(s);
    },
    onMessage(cb: (data: string) => void): void {
      messageListeners.push(cb);
    },
    onOpen(cb: () => void): void {
      openListeners.push(cb);
    },
    onClose(cb: () => void): void {
      closeListeners.push(cb);
    },
    close(): void {
      isClosed = true;
      dataChannel.close();
      pc.close();
      closeListeners.forEach((cb) => cb());
    },
  };
}

export function createAnswerer(
  sendSignal: (data: unknown) => void,
): WebRtcConnectionHandle {
  const pc = createPeerConnection();
  let dataChannel: RTCDataChannel | null = null;
  const messageListeners: Array<(data: string) => void> = [];
  const openListeners: Array<() => void> = [];
  const closeListeners: Array<() => void> = [];

  let isClosed = false;

  pc.ondatachannel = (event) => {
    dataChannel = event.channel;
    dataChannel.onmessage = (e) => {
      const s = typeof e.data === "string" ? e.data : "";
      messageListeners.forEach((cb) => cb(s));
    };
    dataChannel.onopen = () => openListeners.forEach((cb) => cb());
    dataChannel.onclose = () => closeListeners.forEach((cb) => cb());
  };

  pc.onicecandidate = (event) => {
    if (event.candidate && !isClosed) sendSignal(event.candidate.toJSON());
  };

  return {
    receiveSignal(data: unknown): void {
      if (isClosed) return;
      if (isSessionDescription(data)) {
        pc.setRemoteDescription(new RTCSessionDescription(data))
          .then(async () => {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            if (pc.localDescription && !isClosed)
              sendSignal(pc.localDescription);
          })
          .catch(() => {
            if (!isClosed) closeListeners.forEach((cb) => cb());
          });
        return;
      }
      if (isIceCandidate(data)) {
        pc.addIceCandidate(new RTCIceCandidate(data)).catch(() => {});
      }
    },
    send(data: string | object): void {
      const state = dataChannel?.readyState;
      if (state !== "open") {
        console.log("[WebRTC connection] send skipped (channel not open)", {
          state: state ?? "no channel",
          type:
            typeof data === "object" && data !== null && "type" in data
              ? (data as { type: string }).type
              : "?",
        });
        return;
      }
      const s = typeof data === "string" ? data : JSON.stringify(data);
      dataChannel!.send(s);
    },
    onMessage(cb: (data: string) => void): void {
      messageListeners.push(cb);
    },
    onOpen(cb: () => void): void {
      openListeners.push(cb);
    },
    onClose(cb: () => void): void {
      closeListeners.push(cb);
    },
    close(): void {
      isClosed = true;
      dataChannel?.close();
      pc.close();
      closeListeners.forEach((cb) => cb());
    },
  };
}
