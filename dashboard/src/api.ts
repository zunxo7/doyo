export const API = "https://api.letdoyo.com";
const TOKEN_KEY = "doyo_ops_token";

export type LogLine = { text: string; at: number; from: "doyo" | "worker"; name?: string };
export type Booking = {
  id: string;
  createdAt: number;
  customer: string;
  simulatedCustomer: boolean;
  service: string;
  detail: string;
  address: string;
  status: string;
  booker: string;
  agentStatus: string | null;
  ask: number;
  limit: number | null;
  agreed: number | null;
  underLimit: number | null;
  offers: number;
  counters: number;
  secondsToBook: number | null;
  worker: string | null;
  simulatedWorker: boolean | null;
  payment: string;
  paymentStatus: string | null;
  commission: number | null;
  workerShare: number | null;
  log: LogLine[];
  offerList: { name: string; price: number; rating: string; minutesAway: number; status: string; simulated: boolean }[];
  paypal: { id: string; kind: string; status: string; amount: number; captureId: string | null; payoutBatchId: string | null }[];
};
export type Overview = {
  at: number;
  jobs: Booking[];
  workers: { id: string; name: string; simulated: boolean; jobs: number; earned: number; commission: number; paidOut: number; commissionDue: number }[];
  payments: { id: string; kind: string; status: string; amount: number; jobId: string | null; captureId: string | null; payoutBatchId: string | null }[];
};

export const getToken = () => sessionStorage.getItem(TOKEN_KEY);
export const setToken = (token: string | null) => (token ? sessionStorage.setItem(TOKEN_KEY, token) : sessionStorage.removeItem(TOKEN_KEY));

export async function call<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const token = getToken();
  const response = await fetch(API + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(token ? { "x-doyo-token": token } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  const json = await response.json();
  if (!response.ok) throw Object.assign(new Error(json.error ?? "Something went wrong."), { status: response.status });
  return json as T;
}

/** The same email code the app uses. */
export async function signIn(email: string, code: string): Promise<void> {
  const { challenge } = await call<{ challenge: string }>("/api/join/send-otp", { email });
  const { token } = await call<{ token: string }>("/api/join/verify-otp", { email, otp: code, challenge });
  setToken(token);
}

/** Refetch whenever the server says a booking changed. */
export function watch(onChange: () => void, onStatus: (live: boolean) => void): () => void {
  let socket: WebSocket | null = null;
  let closed = false;
  let retry: ReturnType<typeof setTimeout>;
  const connect = () => {
    socket = new WebSocket(`${API.replace(/^http/, "ws")}/live?token=${encodeURIComponent(getToken() ?? "")}`);
    socket.onopen = () => {
      socket?.send(JSON.stringify({ type: "join", topic: "ops" }));
      onStatus(true);
      onChange();
    };
    socket.onmessage = onChange;
    socket.onclose = () => {
      onStatus(false);
      if (!closed) retry = setTimeout(connect, 2500);
    };
  };
  connect();
  return () => {
    closed = true;
    clearTimeout(retry);
    socket?.close();
  };
}
