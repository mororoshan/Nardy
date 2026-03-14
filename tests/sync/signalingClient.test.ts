/**
 * Unit tests for SignalingClient: identified payload, leaderboard, requestLeaderboard.
 * WebSocket is mocked so we can simulate server messages and assert sent payloads.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type {
  IdentifiedPayload,
  LeaderboardPayload,
} from "../../src/sync/signalingClient";
import { SignalingClient } from "../../src/sync/signalingClient";

const mockWsInstances: MockWebSocket[] = [];

class MockWebSocket {
  static readonly OPEN = 1;
  url: string;
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  sent: string[] = [];

  constructor(url: string) {
    this.url = url;
    mockWsInstances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = 3;
  }
}

describe("SignalingClient", () => {
  const originalWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    mockWsInstances.length = 0;
    (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket =
      MockWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket =
      originalWebSocket;
  });

  describe("identified", () => {
    it("calls onIdentified with payload when server sends identified message", async () => {
      const client = new SignalingClient("ws://test");
      const identifiedPayloads: IdentifiedPayload[] = [];
      client.setCallbacks({
        onIdentified: (payload) => identifiedPayloads.push(payload),
      });

      const connectPromise = client.connect();
      const ws = mockWsInstances[0];
      expect(ws).toBeDefined();
      ws!.onopen?.();
      await connectPromise;
      ws!.readyState = MockWebSocket.OPEN;

      ws!.onmessage?.({
        data: JSON.stringify({
          type: "identified",
          playerId: "p1",
          displayName: "P1",
          rating: 1350,
        }),
      } as MessageEvent);

      expect(identifiedPayloads).toHaveLength(1);
      expect(identifiedPayloads[0]).toEqual({
        playerId: "p1",
        displayName: "P1",
        rating: 1350,
      });
    });
  });

  describe("leaderboard", () => {
    it("calls onLeaderboard with entries when server sends leaderboard message", async () => {
      const client = new SignalingClient("ws://test");
      const leaderboardPayloads: LeaderboardPayload[] = [];
      client.setCallbacks({
        onLeaderboard: (payload) => leaderboardPayloads.push(payload),
      });

      const connectPromise = client.connect();
      const ws = mockWsInstances[0];
      ws!.onopen?.();
      await connectPromise;
      ws!.readyState = MockWebSocket.OPEN;

      ws!.onmessage?.({
        data: JSON.stringify({
          type: "leaderboard",
          payload: {
            entries: [
              {
                playerId: "a",
                displayName: "A",
                rating: 1400,
                rank: 1,
              },
            ],
          },
        }),
      } as MessageEvent);

      expect(leaderboardPayloads).toHaveLength(1);
      expect(leaderboardPayloads[0].entries).toHaveLength(1);
      expect(leaderboardPayloads[0].entries[0]).toEqual({
        playerId: "a",
        displayName: "A",
        rating: 1400,
        rank: 1,
      });
    });
  });

  describe("requestLeaderboard", () => {
    it("sends leaderboard request with limit and offset", async () => {
      const client = new SignalingClient("ws://test");
      client.setCallbacks({});

      const connectPromise = client.connect();
      const ws = mockWsInstances[0];
      ws!.onopen?.();
      await connectPromise;
      ws!.readyState = MockWebSocket.OPEN;

      client.requestLeaderboard(10, 5);

      expect(ws!.sent).toHaveLength(1);
      const parsed = JSON.parse(ws!.sent[0]);
      expect(parsed).toEqual({
        type: "leaderboard",
        payload: { limit: 10, offset: 5 },
      });
    });

    it("clamps limit to 100 and offset to 0 when out of range", async () => {
      const client = new SignalingClient("ws://test");
      client.setCallbacks({});

      const connectPromise = client.connect();
      const ws = mockWsInstances[0];
      ws!.onopen?.();
      await connectPromise;
      ws!.readyState = MockWebSocket.OPEN;

      client.requestLeaderboard(200, -1);

      expect(ws!.sent).toHaveLength(1);
      const parsed = JSON.parse(ws!.sent[0]);
      expect(parsed.payload.limit).toBe(100);
      expect(parsed.payload.offset).toBe(0);
    });
  });

  describe("queue.status", () => {
    it("calls onQueueStatus with mode and status when server sends queue.status", async () => {
      const client = new SignalingClient("ws://test");
      const statuses: {
        mode: string | undefined;
        status: "joined" | "left";
      }[] = [];
      client.setCallbacks({
        onQueueStatus: (mode, status) => statuses.push({ mode, status }),
      });

      const connectPromise = client.connect();
      const ws = mockWsInstances[mockWsInstances.length - 1];
      ws.onopen?.();
      await connectPromise;
      ws.readyState = MockWebSocket.OPEN;

      ws.onmessage?.({
        data: JSON.stringify({
          type: "queue.status",
          payload: { mode: "ranked-classic", status: "joined" },
        }),
      } as MessageEvent);

      expect(statuses).toHaveLength(1);
      expect(statuses[0]).toEqual({ mode: "ranked-classic", status: "joined" });
    });

    it("calls onQueueStatus with status left when server sends queue.status without mode", async () => {
      const client = new SignalingClient("ws://test");
      const statuses: {
        mode: string | undefined;
        status: "joined" | "left";
      }[] = [];
      client.setCallbacks({
        onQueueStatus: (mode, status) => statuses.push({ mode, status }),
      });

      const connectPromise = client.connect();
      const ws = mockWsInstances[mockWsInstances.length - 1];
      ws.onopen?.();
      await connectPromise;
      ws.readyState = MockWebSocket.OPEN;

      ws.onmessage?.({
        data: JSON.stringify({
          type: "queue.status",
          payload: { status: "left" },
        }),
      } as MessageEvent);

      expect(statuses).toHaveLength(1);
      expect(statuses[0].status).toBe("left");
    });
  });

  describe("game.result.ack", () => {
    it("calls onGameResultAck with roomId when server sends game.result.ack", async () => {
      const client = new SignalingClient("ws://test");
      const acks: string[] = [];
      client.setCallbacks({
        onGameResultAck: (roomId) => acks.push(roomId),
      });

      const connectPromise = client.connect();
      const ws = mockWsInstances[mockWsInstances.length - 1];
      ws.onopen?.();
      await connectPromise;
      ws.readyState = MockWebSocket.OPEN;

      ws.onmessage?.({
        data: JSON.stringify({
          type: "game.result.ack",
          payload: { roomId: "room-123" },
        }),
      } as MessageEvent);

      expect(acks).toHaveLength(1);
      expect(acks[0]).toBe("room-123");
    });
  });
});
