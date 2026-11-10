import { AppState } from "react-native";
import { WS_BASE_URL } from "./apiBase";
import { getSessionToken } from "./auth";
import { handleUnauthorized } from "./authFailure";

export type LiveStatus = "connecting" | "open" | "closed";

export type LiveChannelOptions = {
  topic: string;
  params?: Record<string, string | number | string[] | undefined | null>;
  onMessage: (msg: any) => void;
  onStatus?: (status: LiveStatus) => void;
};

export type LiveSocket = {
  send: (data: { type: string; [key: string]: unknown }) => void;
  close: () => void;
};

type Subscriber = Pick<LiveChannelOptions, "onMessage" | "onStatus">;

type Topic = {
  params: Record<string, unknown>;
  subscribers: Set<Subscriber>;
  // The newest message of each type, replayed to anyone who subscribes later.
  latest: Map<string, unknown>;
};

const UNAUTHORIZED_CLOSE_CODE = 4401;
const BASE_RETRY_MS = 1_000;
const MAX_RETRY_MS = 30_000;
// One-off events, not state, so a late subscriber must not see them again.
const NOT_REPLAYED = new Set(["offer_declined"]);

const topics = new Map<string, Topic>();
let socket: WebSocket | null = null;
let dialing = false;
let retries = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let watchingAppState = false;

const isOpen = () => socket?.readyState === WebSocket.OPEN;

function transmit(frame: object): void {
  if (isOpen()) socket?.send(JSON.stringify(frame));
}

function announce(status: LiveStatus): void {
  for (const topic of topics.values()) {
    for (const subscriber of [...topic.subscribers]) subscriber.onStatus?.(status);
  }
}

function cancelRetry(): void {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
}

function scheduleRetry(): void {
  if (retryTimer || topics.size === 0) return;
  const delay = Math.min(BASE_RETRY_MS * 2 ** retries, MAX_RETRY_MS);
  retries += 1;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void connect();
  }, delay + Math.random() * 400);
}

function deliver(raw: unknown): void {
  let frame: { topic?: string; msg?: { type?: string } };
  try {
    frame = JSON.parse(String(raw));
  } catch {
    return;
  }
  const topic = frame.topic ? topics.get(frame.topic) : undefined;
  const msg = frame.msg;
  if (!topic || !msg) return;
  if (msg.type && !NOT_REPLAYED.has(msg.type)) topic.latest.set(msg.type, msg);
  for (const subscriber of [...topic.subscribers]) subscriber.onMessage(msg);
}

async function connect(): Promise<void> {
  if (socket || dialing || topics.size === 0) return;
  cancelRetry();
  dialing = true;
  const token = await getSessionToken();
  dialing = false;
  if (socket || topics.size === 0 || AppState.currentState === "background") return;
  if (!token) {
    announce("closed");
    scheduleRetry();
    return;
  }

  announce("connecting");
  const opened = new WebSocket(`${WS_BASE_URL}/live?token=${encodeURIComponent(token)}`);
  socket = opened;
  opened.onopen = () => {
    if (socket !== opened) return;
    retries = 0;
    for (const [name, topic] of topics) transmit({ type: "join", topic: name, params: topic.params });
    announce("open");
  };
  opened.onmessage = event => {
    if (socket === opened) deliver(event.data);
  };
  opened.onclose = event => {
    if (socket !== opened) return;
    socket = null;
    announce("closed");
    if (event.code === UNAUTHORIZED_CLOSE_CODE) void handleUnauthorized("live");
    else scheduleRetry();
  };
}

function disconnect(): void {
  cancelRetry();
  const closing = socket;
  socket = null;
  closing?.close();
}

function watchAppState(): void {
  if (watchingAppState) return;
  watchingAppState = true;
  AppState.addEventListener("change", state => {
    if (state === "background") {
      disconnect();
      announce("closed");
    } else if (state === "active") {
      retries = 0;
      void connect();
    }
  });
}

function withoutEmptyValues(params: LiveChannelOptions["params"] = {}): Record<string, unknown> {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}

export function openLiveChannel({ topic: name, params, onMessage, onStatus }: LiveChannelOptions): LiveSocket {
  watchAppState();

  const existing = topics.get(name);
  const topic: Topic = existing ?? { params: withoutEmptyValues(params), subscribers: new Set(), latest: new Map() };
  const subscriber: Subscriber = { onMessage, onStatus };
  topics.set(name, topic);
  topic.subscribers.add(subscriber);

  if (isOpen()) {
    if (!existing) transmit({ type: "join", topic: name, params: topic.params });
    onStatus?.("open");
    topic.latest.forEach(msg => onMessage(msg));
  } else {
    onStatus?.("connecting");
    void connect();
  }

  return {
    send: data => {
      if (topic.subscribers.has(subscriber)) transmit({ type: "send", topic: name, data });
    },
    close: () => {
      if (!topic.subscribers.delete(subscriber) || topic.subscribers.size > 0) return;
      topics.delete(name);
      transmit({ type: "leave", topic: name });
      if (topics.size === 0) disconnect();
    },
  };
}
