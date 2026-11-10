import "dotenv/config";
import { randomUUID } from "node:crypto";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import websocket from "@fastify/websocket";
import Fastify, { type FastifyRequest } from "fastify";
import { z } from "zod";
import { advanceDemo, startAgents } from "./agents.ts";
import * as ops from "./ops.ts";
import { registerOta } from "./ota.ts";
import { planRequest } from "./bookingAgent.ts";
import * as paypal from "./paypal.ts";
import { actor, cleanId, HttpError, issueToken } from "./auth.ts";
import * as geo from "./geo.ts";
import * as jobs from "./jobs.ts";
import { attachSocket, onLive } from "./live.ts";
import { requestCode, verifyCode } from "./otp.ts";
import * as store from "./store.ts";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const EXPIRY_SWEEP_MS = 30_000;

const app = Fastify({ logger: { level: "warn" }, bodyLimit: MAX_UPLOAD_BYTES, trustProxy: true });
await app.register(cors);
await app.register(multipart, { limits: { fileSize: MAX_UPLOAD_BYTES } });
await app.register(websocket);

app.addContentTypeParser(/^image\//, { parseAs: "buffer" }, (_req, body, done) => done(null, body));

app.setErrorHandler((error: Error & { statusCode?: number }, _req, reply) => {
  if (error instanceof HttpError) return reply.status(error.status).send({ error: error.message });
  if (error instanceof z.ZodError) return reply.status(400).send({ error: "Some details are missing or invalid." });
  if (error.statusCode && error.statusCode < 500) return reply.status(error.statusCode).send({ error: error.message });
  console.error(error);
  return reply.status(500).send({ error: "Something went wrong." });
});

const lngLat = z.tuple([z.number(), z.number()]);
const jobBody = z.object({
  customerName: z.string().optional(),
  customerPhoto: z.string().nullish(),
  service: z.string(),
  detail: z.string(),
  address: z.string(),
  city: z.string().optional(),
  coordinates: lngLat,
  price: z.number(),
  payment: z.string(),
  workerPreference: z.enum(["Male", "Female", "Any"]),
  notes: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
  rewardId: z.string().optional(),
  agentBudget: z.number().optional(),
  paypalHoldId: z.string().optional(),
});
const offerBody = z.object({
  workerName: z.string(),
  coordinates: lngLat,
  price: z.number(),
  workerRating: z.string().optional(),
  workerJobs: z.string().optional(),
});
const presenceBody = z.object({
  name: z.string().optional(),
  services: z.array(z.string()).optional(),
  coordinates: lngLat.optional(),
  gender: z.string().optional(),
  avatar: z.enum(["male", "female"]).optional(),
  rating: z.string().optional(),
  jobs: z.string().optional(),
  photo: z.string().optional(),
});

type IdParams = { Params: { id: string } };
type OfferParams = { Params: { id: string; offerId: string } };

const userOf = (id: string) => store.get<jobs.User>("users", id);
const emailId = (email: string) => cleanId(email.trim().toLowerCase());

function saveUser(input: Pick<jobs.User, "id" | "email" | "phone" | "name" | "role"> & Partial<jobs.User>): jobs.User {
  const existing = userOf(input.id);
  return store.put<jobs.User>("users", {
    status: "approved",
    services: [],
    ...existing,
    ...input,
  });
}

function accountLookup(user: jobs.User | null) {
  if (!user) return { found: false, status: "not_found" };
  return {
    found: true,
    status: user.status,
    account: { type: user.role, id: user.id, name: user.name, email: user.email, phone: user.phone, gender: user.gender, status: user.status },
  };
}

function presenceFrom(id: string, input: z.infer<typeof presenceBody>): jobs.Presence {
  const user = userOf(id);
  return {
    id,
    name: input.name ?? user?.name ?? "Worker",
    services: input.services ?? user?.services ?? [],
    // Everyone in the demo works out of the same neighbourhood, wherever their phone is.
    coordinates: [DEMO_LOCATION.coordinates[0] + (Math.random() - 0.5) * 0.02, DEMO_LOCATION.coordinates[1] + (Math.random() - 0.5) * 0.02],
    gender: input.gender ?? user?.gender ?? "Any",
    avatar: input.avatar ?? "male",
    rating: input.rating ?? "5.0",
    jobs: input.jobs ?? "0",
    photo: input.photo ?? null,
  };
}

// Judges sign in from anywhere, so the demo always starts where the workers are.
const DEMO_LOCATION = { coordinates: [73.0169, 33.675], address: "G-10 Markaz, Islamabad" };

app.get("/health", async () => ({ ok: true }));
registerOta(app);
app.get("/api/app-config", async () => ({
  workerAppUnlocked: true,
  operatingHours: { open: "00:00", close: "23:59", timezoneOffsetMinutes: 300 },
  reviewLocation: DEMO_LOCATION,
}));

// ---- Sign-in ----

app.post("/api/guest", async () => {
  const id = `guest-${randomUUID().slice(0, 8)}`;
  const user = saveUser({ id, email: `${id}@demo.doyo.local`, phone: "", name: "Guest", role: "customer" });
  return { token: issueToken(id), user };
});

app.post("/api/join/send-otp", async req => {
  const { email } = z.object({ email: z.string().email() }).parse(req.body);
  return requestCode(email);
});

app.post("/api/join/verify-otp", async req => {
  const { email, otp, challenge } = z.object({ email: z.string().email(), otp: z.string(), challenge: z.string() }).parse(req.body);
  verifyCode(email, otp, challenge);
  // Demo-domain accounts may open the operations dashboard.
  if (email.trim().toLowerCase().endsWith("@letdoyo.com")) ops.makeAdmin(emailId(email));
  return { token: issueToken(emailId(email)) };
});

app.post("/api/auth/google", async req => {
  const { idToken } = z.object({ idToken: z.string() }).parse(req.body);
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, { signal: AbortSignal.timeout(8000) });
  const claims = (await response.json()) as { aud?: string; email?: string; email_verified?: string; name?: string };
  const valid = response.ok && claims.aud === process.env.GOOGLE_WEB_CLIENT_ID && claims.email_verified === "true" && claims.email;
  if (!valid) throw new HttpError(401, "Google sign-in could not be verified.");
  return { token: issueToken(emailId(claims.email!)), email: claims.email, name: claims.name ?? null };
});

app.post("/api/session/refresh", async req => ({ token: issueToken(actor(req)) }));

app.get("/api/auth-lookup", async (req: FastifyRequest<{ Querystring: { email?: string } }>) =>
  accountLookup(userOf(emailId(req.query.email ?? ""))),
);

app.get("/api/account-lookup", async (req: FastifyRequest<{ Querystring: { email?: string; phone?: string } }>) => {
  const byEmail = userOf(emailId(req.query.email ?? ""));
  const byPhone = store.list<jobs.User>("users").find(user => req.query.phone && user.phone === req.query.phone);
  return accountLookup(byEmail ?? byPhone ?? null);
});

app.get("/api/worker-application", async (req: FastifyRequest<{ Querystring: { phone?: string } }>) => {
  const user = store.list<jobs.User>("users").find(item => item.role === "worker" && item.phone === req.query.phone);
  if (!user) return { found: false, status: "not_found" };
  return { found: true, status: user.status, application: { id: user.id, fullName: user.name, phone: user.phone, status: user.status } };
});

app.post("/api/customer-register", async req => {
  const input = z
    .object({ email: z.string().email(), phone: z.string(), name: z.string() })
    .parse(req.body);
  const id = emailId(input.email);
  const existing = userOf(id);
  saveUser({ id, email: input.email, phone: input.phone, name: input.name, role: existing?.role ?? "customer" });
  return { ok: true, customerId: id, existing: Boolean(existing) };
});

app.post("/api/app-apply", async req => {
  const fields: Record<string, string> = {};
  const services: string[] = [];
  const files: Record<string, Buffer> = {};
  for await (const part of req.parts()) {
    if (part.type === "file") files[part.fieldname] = await part.toBuffer();
    else if (part.fieldname === "services") services.push(String(part.value));
    else fields[part.fieldname] = String(part.value);
  }
  if (!fields.email || !fields.full_name) throw new HttpError(400, "Your application is missing details.");
  const id = emailId(fields.email);
  saveUser({ id, email: fields.email, phone: fields.phone ?? "", name: fields.full_name, role: "worker", gender: fields.gender, services });
  for (const [name, bytes] of Object.entries(files)) store.putBlob(`cnic:${id}:${name}`, "image/jpeg", bytes);
  return { ok: true };
});

app.post("/api/account/delete", async req => {
  jobs.deleteUserData(actor(req));
  return { ok: true };
});

// ---- Customer ----

app.get("/api/customer-stats", async req => ({ bookings: jobs.completedBookings(actor(req)) }));
app.get("/api/customer-bookings", async req => ({ bookings: jobs.bookingHistory(actor(req)) }));
app.get("/api/customer-loyalty", async req => jobs.loyalty(actor(req)));
app.post("/api/customer-loyalty/redeem", async req => {
  const { reward } = z.object({ reward: z.enum(["free_2000_job", "discount_1000", "discount_500"]) }).parse(req.body);
  return jobs.redeemReward(actor(req), reward);
});

// ---- Worker ----

app.get("/api/worker-stats", async (req: FastifyRequest<{ Querystring: { id?: string } }>) => jobs.workerStats(req.query.id ?? actor(req)));
app.get("/api/worker-earnings", async req => jobs.earnings(actor(req)));
app.post("/api/worker-earnings/settle", async req => ({ earnings: jobs.settleCommission(actor(req)) }));

app.get("/api/workers/:id/services", async (req: FastifyRequest<IdParams>) => ({ services: userOf(req.params.id)?.services ?? [] }));
app.put("/api/workers/:id/services", async (req: FastifyRequest<IdParams>) => {
  const id = actor(req);
  const { services } = z.object({ services: z.array(z.string()) }).parse(req.body);
  const user = userOf(id);
  if (!user) throw new HttpError(404, "Account not found.");
  store.put("users", { ...user, services });
  return { services };
});

app.put("/api/workers/:id/photo", async (req: FastifyRequest<IdParams>) => {
  const id = actor(req);
  store.putBlob(`photo:${id}`, req.headers["content-type"] ?? "image/webp", req.body as Buffer);
  return { url: `${req.protocol}://${req.host}/api/worker-photo/${encodeURIComponent(id)}` };
});

app.get("/api/worker-photo/:id", async (req: FastifyRequest<IdParams>, reply) => {
  const photo = store.getBlob(`photo:${req.params.id}`);
  if (!photo) throw new HttpError(404, "No photo.");
  return reply.type(photo.type).send(photo.bytes);
});

app.post("/api/workers/:id/online", async req => {
  jobs.goOnline(presenceFrom(actor(req), presenceBody.parse(req.body)));
  return { ok: true };
});
app.delete("/api/workers/:id/online", async req => {
  jobs.goOffline(actor(req));
  return { ok: true };
});
app.get("/api/workers/:id/active-job", async req => ({ job: jobs.activeJobFor(actor(req)) }));

// ---- Jobs ----

app.post("/api/demo/advance", async req => {
  advanceDemo(actor(req));
  return { ok: true };
});
app.post("/api/demo/worker", async req => {
  const input = z.object({ email: z.string(), name: z.string(), phone: z.string() }).parse(req.body);
  return { user: saveUser({ ...input, id: actor(req), role: "worker" }) };
});

app.get("/api/ops/overview", async req => {
  if (!ops.isAdmin(actor(req))) throw new HttpError(403, "Sign in with a demo account to open the dashboard.");
  return ops.overview();
});

app.post("/api/agent/plan", async req => {
  actor(req);
  const { text, plan } = z.object({ text: z.string().trim().min(1).max(300), plan: z.record(z.string(), z.unknown()).nullish() }).parse(req.body);
  return planRequest(text, plan ?? undefined);
});

app.post("/api/jobs", async req => {
  const userId = actor(req);
  const { paypalHoldId, ...input } = jobBody.parse(req.body);
  const paypalHold = paypalHoldId ? paypal.claimHold(paypalHoldId, userId, input.agentBudget ?? input.price) : undefined;
  if (input.payment === "PayPal" && !paypalHold && !paypal.isLinked(userId)) throw new HttpError(402, "Link your PayPal first.");
  const created = jobs.createJob(userId, { ...input, paypalHold } as jobs.CreateJob);
  if (paypalHold) paypal.linkHold(paypalHold.id, created.job.id);
  return created;
});

app.get("/api/jobs/:id", async (req: FastifyRequest<IdParams>) => {
  const { job, offers } = jobs.jobState(jobs.getJob(req.params.id), actor(req));
  return { job, offers };
});

app.post("/api/jobs/:id/price", async (req: FastifyRequest<IdParams>) => {
  const { price } = z.object({ price: z.number() }).parse(req.body);
  jobs.raisePrice(req.params.id, actor(req), price);
  return { ok: true };
});

app.post("/api/jobs/:id/agent/stop", async (req: FastifyRequest<IdParams>) => {
  jobs.stopAgent(req.params.id, actor(req));
  return { ok: true };
});

app.post("/api/jobs/:id/offers", async (req: FastifyRequest<IdParams>) => {
  const input = offerBody.parse(req.body);
  const workerId = actor(req);
  const offer = jobs.submitOffer(req.params.id, {
    workerId,
    name: input.workerName,
    avatar: jobs.online.get(workerId)?.avatar ?? "male",
    rating: input.workerRating ?? "5.0",
    jobs: input.workerJobs ?? "0",
    price: input.price,
    coordinates: input.coordinates,
  });
  return { offer };
});

app.post("/api/jobs/:id/offers/:offerId/accept", async (req: FastifyRequest<OfferParams>) => ({
  acceptedOffer: jobs.acceptOffer(req.params.id, req.params.offerId, actor(req)),
}));
app.post("/api/jobs/:id/offers/:offerId/decline", async (req: FastifyRequest<OfferParams>) => {
  jobs.declineOffer(req.params.id, req.params.offerId, actor(req));
  return { ok: true };
});
app.post("/api/jobs/:id/offers/:offerId/cancel", async (req: FastifyRequest<OfferParams>) => {
  jobs.cancelOffer(req.params.id, req.params.offerId, actor(req));
  return { ok: true };
});

app.post("/api/jobs/:id/cancel", async (req: FastifyRequest<IdParams>) => {
  const { reason } = z.object({ reason: z.string().optional() }).parse(req.body);
  jobs.cancelJob(req.params.id, actor(req), reason);
  return { ok: true };
});
app.post("/api/jobs/:id/dismiss", async (req: FastifyRequest<IdParams>) => {
  jobs.dismissJob(req.params.id, actor(req));
  return { ok: true };
});
app.post("/api/jobs/:id/phase", async (req: FastifyRequest<IdParams>) => {
  const { phase } = z.object({ phase: z.enum(["enroute", "arrived", "working", "completed"]) }).parse(req.body);
  jobs.updatePhase(req.params.id, actor(req), phase);
  return { ok: true };
});
app.post("/api/jobs/:id/start", async (req: FastifyRequest<IdParams>) => {
  const { code } = z.object({ code: z.string() }).parse(req.body);
  return { job: jobs.startJob(req.params.id, actor(req), code) };
});
app.post("/api/jobs/:id/complete", async (req: FastifyRequest<IdParams>) => {
  jobs.completeJob(req.params.id, actor(req));
  return { ok: true };
});
app.post("/api/jobs/:id/rating", async (req: FastifyRequest<IdParams>) => {
  const { rating, compliments } = z.object({ rating: z.number(), compliments: z.array(z.string()).default([]) }).parse(req.body);
  jobs.rateJob(req.params.id, actor(req), rating, compliments);
  return { ok: true };
});
app.post("/api/jobs/:id/location", async (req: FastifyRequest<IdParams>) => {
  const { coordinates } = z.object({ coordinates: lngLat }).parse(req.body);
  jobs.setWorkerLocation(req.params.id, actor(req), coordinates);
  return { ok: true };
});
app.get("/api/jobs/:id/chat", async (req: FastifyRequest<IdParams>) => ({ messages: jobs.listChat(req.params.id, actor(req)) }));
app.post("/api/jobs/:id/chat", async (req: FastifyRequest<IdParams>) => {
  const { text } = z.object({ text: z.string() }).parse(req.body);
  return { messages: jobs.sendChat(req.params.id, actor(req), text) };
});

// ---- PayPal ----

const publicBase = (req: FastifyRequest) => `https://${req.host}`;
const amountBody = z.object({ amount: z.number() });

app.post("/api/paypal/hold", async req => paypal.startHold(actor(req), amountBody.parse(req.body).amount, publicBase(req)));
app.post("/api/paypal/commission", async req => paypal.startCommissionPayment(actor(req), amountBody.parse(req.body).amount, publicBase(req)));
app.get("/api/paypal/link", async req => ({ linked: paypal.isLinked(actor(req)) }));
app.post("/api/paypal/link", async req => paypal.startLink(actor(req), publicBase(req)));
app.post("/api/paypal/link/:id/confirm", async (req: FastifyRequest<IdParams>) => paypal.confirmLink(req.params.id, actor(req)));
app.post("/api/paypal/:id/confirm", async (req: FastifyRequest<IdParams>) => paypal.confirm(req.params.id, actor(req)));

const backToApp = (title: string) => `<!doctype html><meta name="viewport" content="width=device-width"><title>Doyo</title><p style="font:16px sans-serif;text-align:center;margin-top:40vh">${title}</p>`;
app.get("/paypal/return", async (_req, reply) => reply.type("text/html").send(backToApp("Back to Doyo…")));
app.get("/paypal/cancel", async (_req, reply) => reply.type("text/html").send(backToApp("Payment cancelled. You can close this page.")));

// ---- Support and diagnostics ----

app.post("/api/support-reports", async req => {
  const { category, details } = z.object({ category: z.string(), details: z.string() }).parse(req.body);
  store.put("support", { id: randomUUID(), userId: actor(req), category, details, at: Date.now() });
  return { ok: true };
});
app.post("/api/client-errors", async () => ({ ok: true }));

// ---- Maps ----

app.get("/api/geocode/reverse", async (req: FastifyRequest<{ Querystring: { lat: string; lon: string } }>) => ({
  address: await geo.reverseGeocode(Number(req.query.lat), Number(req.query.lon)),
}));
app.get("/api/geocode/search", async (req: FastifyRequest<{ Querystring: { q: string } }>) => ({
  results: await geo.searchPlaces(req.query.q),
}));
app.get("/api/geocode/place", async (req: FastifyRequest<{ Querystring: { id: string } }>) => ({
  result: await geo.placeDetails(req.query.id),
}));
app.post("/api/route", async req => {
  const { from, to } = z.object({ from: lngLat, to: lngLat }).parse(req.body);
  return geo.route(from, to);
});

app.get("/map/*", async (req: FastifyRequest<{ Params: { "*": string } }>, reply) => {
  const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  const asset = await geo.mapAsset(`/${req.params["*"]}${query}`, `${req.protocol}://${req.host}/map`);
  return reply.type(asset.type).header("cache-control", "public, max-age=3600").send(asset.body);
});

// ---- Live ----

app.get("/live", { websocket: true }, (socket, req) => {
  attachSocket(socket, (req.query as { token?: string }).token);
});

onLive({
  join(topic, userId, params, send) {
    const [kind, id] = topic.split(":");
    if (kind === "job" && id) {
      const job = store.get<jobs.Job>("jobs", id);
      send(job ? jobs.jobState(job, userId) : { type: "state", ok: false, offers: [] });
    } else if (kind === "ops") {
      if (ops.isAdmin(userId)) ops.watchOps(userId);
    } else if (kind === "market") {
      const coordinates = typeof params.lng === "number" && typeof params.lat === "number" ? ([params.lng, params.lat] as geo.LngLat) : undefined;
      jobs.goOnline(presenceFrom(userId, presenceBody.parse({ ...params, coordinates })), send);
    }
  },
  leave(topic, userId) {
    if (topic.startsWith("market:")) jobs.goOffline(userId);
  },
  frame(topic, userId, data) {
    const [kind, id] = topic.split(":");
    if (kind === "job" && id && data.type === "location" && Array.isArray(data.coordinates)) {
      jobs.setWorkerLocation(id, userId, data.coordinates as geo.LngLat);
    }
  },
});

startAgents();
ops.startOps();
paypal.startPayments();
setInterval(jobs.expireOpenJobs, EXPIRY_SWEEP_MS).unref();

await app.listen({ port: Number(process.env.PORT) || 8787, host: "0.0.0.0" });
console.log(`Doyo backend listening on ${app.server.address() && (app.server.address() as { port: number }).port}`);
