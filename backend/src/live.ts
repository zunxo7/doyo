import type { WebSocket } from "ws";
import { verifyToken } from "./auth.ts";

type Params = Record<string, unknown>;
type Member = { socket: WebSocket; topic: string };
type Handlers = {
  join?: (topic: string, userId: string, params: Params, send: (msg: object) => void) => void;
  leave?: (topic: string, userId: string) => void;
  frame?: (topic: string, userId: string, data: Record<string, unknown>) => void;
};

// Keyed by "<topic>:<userId>" so a job's state can differ per viewer.
const audiences = new Map<string, Set<Member>>();
const handlers: Handlers = {};

export function onLive(next: Handlers): void {
  Object.assign(handlers, next);
}

const encode = (topic: string, msg: object) => JSON.stringify({ topic, msg });

/** Delivers to one user's subscribers: `job:<id>:<userId>`, or `market:<workerId>`. */
export function publish(audience: string, msg: object): void {
  for (const { socket, topic } of audiences.get(audience) ?? []) socket.send(encode(topic, msg));
}

export function attachSocket(socket: WebSocket, token: string | undefined): void {
  const userId = verifyToken(token);
  if (!userId) {
    socket.close(4401, "unauthorized");
    return;
  }
  const joined = new Map<string, { key: string; member: Member }>();

  const leave = (topic: string) => {
    const entry = joined.get(topic);
    if (!entry) return;
    joined.delete(topic);
    const members = audiences.get(entry.key);
    members?.delete(entry.member);
    if (members?.size === 0) audiences.delete(entry.key);
    handlers.leave?.(topic, userId);
  };

  socket.on("message", raw => {
    let data: { type?: string; topic?: string; params?: Params; data?: Record<string, unknown> };
    try {
      data = JSON.parse(String(raw));
    } catch {
      return;
    }
    const topic = data.topic;
    if (!topic) return;
    if (data.type === "join" && !joined.has(topic)) {
      const key = topic.startsWith("market:") ? `market:${userId}` : `${topic}:${userId}`;
      const member = { socket, topic };
      if (!audiences.has(key)) audiences.set(key, new Set());
      audiences.get(key)!.add(member);
      joined.set(topic, { key, member });
      handlers.join?.(topic, userId, data.params ?? {}, msg => socket.send(encode(topic, msg)));
    } else if (data.type === "leave") {
      leave(topic);
    } else if (data.type === "send" && joined.has(topic) && data.data) {
      handlers.frame?.(topic, userId, data.data);
    }
  });
  socket.on("close", () => [...joined.keys()].forEach(leave));
}
