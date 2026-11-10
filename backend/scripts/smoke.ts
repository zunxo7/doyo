// Runs one full booking against a server on BASE, including the live socket.
const BASE = process.env.BASE || "http://127.0.0.1:8799";

const guest = (await (await fetch(`${BASE}/api/guest`, { method: "POST" })).json()) as { token: string; user: { id: string } };
const headers = { "content-type": "application/json", "x-doyo-token": guest.token };

async function api<T = any>(path: string, body?: object): Promise<T> {
  const response = await fetch(`${BASE}${path}`, { method: body ? "POST" : "GET", headers, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok) throw new Error(`${path}: ${response.status} ${JSON.stringify(data)}`);
  return data as T;
}

const { job } = await api("/api/jobs", {
  customerName: "Smoke",
  service: "home",
  detail: "2 rooms",
  address: "Bahria Town",
  coordinates: [73.1, 33.53],
  price: 2000,
  payment: "Cash",
  workerPreference: "Any",
});
console.log("job created", job.id);

const socket = new WebSocket(`${BASE.replace("http", "ws")}/live?token=${guest.token}`);
const seen = new Set<string>();
let latest: any = null;
socket.onopen = () => socket.send(JSON.stringify({ type: "join", topic: `job:${job.id}`, params: { role: "customer" } }));
socket.onmessage = event => {
  const { msg } = JSON.parse(String(event.data));
  seen.add(msg.type);
  if (msg.type === "state") latest = msg;
};

const until = async (label: string, test: () => boolean, ms = 60000) => {
  const deadline = Date.now() + ms;
  while (!test()) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${label}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  console.log("ok:", label);
};

await until("three offers over the socket", () => latest?.offers?.filter((o: any) => o.status === "pending").length >= 3);
const offer = latest.offers[0];
console.log("offer", offer.name, offer.price);
await api(`/api/jobs/${job.id}/offers/${offer.id}/accept`, {});
await until("assigned with start code", () => latest?.job?.status === "assigned" && Boolean(latest.job.startCode));
await api(`/api/jobs/${job.id}/chat`, { text: "Please call when you arrive" });
await until("worker chat reply", () => seen.has("chat"));
await until("worker location", () => seen.has("worker_location"));
await until("completed", () => latest?.job?.status === "completed");
await api(`/api/jobs/${job.id}/rating`, { rating: 5, compliments: ["Friendly"] });

const history = await api("/api/customer-bookings");
const loyalty = await api("/api/customer-loyalty");
if (history.bookings.length !== 1) throw new Error("history missing the booking");
if (loyalty.points !== 15) throw new Error(`expected 15 points, got ${loyalty.points}`);
console.log("ok: history and loyalty", loyalty.points);
socket.close();
console.log("SMOKE PASSED");
process.exit(0);
