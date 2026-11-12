import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import { HttpError } from "./auth.ts";
import { distanceKm, type LngLat } from "./geo.ts";
import { publish } from "./live.ts";
import * as store from "./store.ts";

export const COMMISSION_RATE = 0.15;
const POINTS_PER_BOOKING = 10;
const POINTS_PER_FIVE_STAR = 5;
// How long a request stays open before it stops notifying workers.
const JOB_OPEN_MS = 15 * 60_000;
// Matches DECLINE_SNOOZE_MS in the app.
const DECLINE_SNOOZE_MS = 500;
const REWARD_LIFETIME_MS = 30 * 86_400_000;
const REWARDS = {
  discount_500: { label: "PKR100 discount", amountOff: 100, points: 100 },
  free_2000_job: { label: "PKR250 discount", amountOff: 250, points: 250 },
  discount_1000: { label: "PKR500 discount", amountOff: 500, points: 500 },
} as const;

export type Role = "customer" | "worker";
export type Phase = "enroute" | "arrived" | "working" | "completed";
type Rating = { rating: number; compliments: string[]; ratedAt: number };
export type AgentLine = {
  text: string;
  at: number;
  from: "doyo" | "worker";
  name?: string;
  avatar?: "male" | "female";
  workerId?: string;
  // Set when the line came with an offer, so the chat can show the offer where it was made.
  offerId?: string;
  price?: number;
  rating?: string;
  jobs?: string;
  minutesAway?: number;
};
export type AgentState = {
  status: "working" | "booked" | "stopped";
  budget: number;
  offerId: string | null;
  log: AgentLine[];
};

export type Job = {
  id: string;
  createdAt: number;
  customerId: string;
  customerName: string;
  customerPhoto: string | null;
  customerRating: string;
  service: string;
  detail: string;
  address: string;
  city: string;
  coordinates: LngLat;
  price: number;
  payment: string;
  workerPreference: "Male" | "Female" | "Any";
  notes: string;
  details: Record<string, unknown> | null;
  status: "open" | "assigned" | "in_progress" | "completed" | "cancelled";
  cancelReason: string | null;
  cancelledBy: Role | null;
  acceptedWorkerId: string | null;
  acceptedPrice: number | null;
  workerLocation: LngLat | null;
  workerLocationUpdatedAt: number | null;
  workerPhase: Phase | null;
  startCode: string | null;
  startedAt: number | null;
  endedAt: number | null;
  shareCode: string;
  rewardId: string | null;
  ratings: { customer: Rating | null; worker: Rating | null };
  chat: ChatMessage[];
  agent: AgentState | null;
  paypalHold: { id: string; amount: number } | null;
  counters?: Record<string, number>;
  paymentStatus?: "paid" | "failed";
};

export type Offer = {
  id: string;
  jobId: string;
  workerId: string;
  name: string;
  avatar: "male" | "female";
  rating: string;
  jobs: string;
  price: number;
  minutesAway: number;
  distanceKm: number;
  coordinates: LngLat;
  status: "pending" | "accepted" | "declined" | "cancelled" | "rejected";
  message?: string;
};

export type ChatMessage = { id: string; senderId: string; senderRole: Role; text: string; createdAt: number };

export type Presence = {
  id: string;
  name: string;
  services: string[];
  coordinates: LngLat | null;
  gender: string;
  avatar: "male" | "female";
  rating: string;
  jobs: string;
  photo: string | null;
};

export type User = {
  id: string;
  email: string;
  phone: string;
  name: string;
  role: Role;
  gender?: string;
  status: string;
  services: string[];
  referredBy?: string;
};

type Txn = { id: string; type: "earn" | "redeem"; label: string; sub?: string | null; points: number; at: number };
type OwnedReward = { id: string; key: keyof typeof REWARDS; label: string; amountOff: number; expiresAt: number };
type Loyalty = { id: string; points: number; transactions: Txn[]; owned: OwnedReward[] };
type LedgerTxn = { id: string; label: string; sub: string; at: number; amount: number; type: "earning" | "commission" | "topup" | "payout" };
type Ledger = { id: string; commissionDue: number; transactions: LedgerTxn[] };

// One person often drives both sides of the demo, so the code must be known in advance.
const DEMO_START_CODE = "0000";

export const events = new EventEmitter();
export const online = new Map<string, Presence>();
const snoozed = new Map<string, number>();

const newId = (prefix: string) => `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
const saveJob = (job: Job) => store.put("jobs", job);
const offersFor = (jobId: string) => store.list<Offer>("offers").filter(offer => offer.jobId === jobId);

export function getJob(id: string): Job {
  const job = store.get<Job>("jobs", id);
  if (!job) throw new HttpError(404, "This request no longer exists.");
  return job;
}

function getOffer(job: Job, offerId: string): Offer {
  const offer = store.get<Offer>("offers", offerId);
  if (!offer || offer.jobId !== job.id) throw new HttpError(404, "This offer no longer exists.");
  return offer;
}

const publicJob = ({ chat: _chat, counters: _counters, ...job }: Job) => job;

/** Workers never receive the start code, which proves they reached the customer, or the agent, which holds the budget. */
function jobFor(job: Job, viewerId: string) {
  const view = publicJob(job);
  return viewerId === job.customerId ? view : { ...view, startCode: null, agent: null };
}

export function jobState(job: Job, viewerId: string) {
  const visible = viewerId === job.customerId ? offersFor(job.id) : offersFor(job.id).filter(offer => offer.workerId === viewerId);
  return { type: "state", ok: true, job: jobFor(job, viewerId), offers: visible };
}

function broadcast(job: Job): void {
  events.emit("job:changed", job);
  publish(`job:${job.id}:${job.customerId}`, jobState(job, job.customerId));
  const workers = new Set(offersFor(job.id).map(offer => offer.workerId));
  for (const workerId of workers) publish(`job:${job.id}:${workerId}`, jobState(job, workerId));
  publishMarket();
}

function assertCustomer(job: Job, userId: string): void {
  if (job.customerId !== userId) throw new HttpError(403, "This is not your request.");
}

function assertAssignedWorker(job: Job, userId: string): void {
  if (job.acceptedWorkerId !== userId) throw new HttpError(403, "You are not assigned to this job.");
}

export type CreateJob = Pick<Job, "service" | "detail" | "address" | "coordinates" | "price" | "payment" | "workerPreference"> &
  Partial<Pick<Job, "customerName" | "customerPhoto" | "city" | "notes" | "details" | "rewardId">> & { agentBudget?: number; paypalHold?: Job["paypalHold"] };

export const liveJobOf = (customerId: string) =>
  store.list<Job>("jobs").find(job => job.customerId === customerId && ["open", "assigned", "in_progress"].includes(job.status));

export function createJob(customerId: string, input: CreateJob) {
  const live = liveJobOf(customerId);
  if (live) throw new HttpError(409, "You already have an active request.");
  if (!(input.price > 0)) throw new HttpError(400, "Enter a price above zero.");
  if (input.agentBudget !== undefined && input.agentBudget < input.price) throw new HttpError(400, "Your budget cannot be below your price.");
  if (input.rewardId) spendReward(customerId, input.rewardId);
  const job = saveJob({
    id: newId("job"),
    createdAt: Date.now(),
    customerId,
    customerName: input.customerName || "Customer",
    customerPhoto: input.customerPhoto ?? null,
    customerRating: customerRating(customerId),
    service: input.service,
    detail: input.detail,
    address: input.address,
    city: input.city || "Pakistan",
    coordinates: input.coordinates,
    price: input.price,
    payment: input.payment,
    workerPreference: input.workerPreference,
    notes: input.notes ?? "",
    details: input.details ?? null,
    status: "open",
    cancelReason: null,
    cancelledBy: null,
    acceptedWorkerId: null,
    acceptedPrice: null,
    workerLocation: null,
    workerLocationUpdatedAt: null,
    workerPhase: null,
    startCode: null,
    startedAt: null,
    endedAt: null,
    shareCode: randomUUID().slice(0, 8),
    rewardId: input.rewardId ?? null,
    ratings: { customer: null, worker: null },
    chat: [],
    agent: input.agentBudget === undefined ? null : { status: "working", budget: input.agentBudget, offerId: null, log: [] },
    paypalHold: input.paypalHold ?? null,
  });
  publishMarket();
  events.emit("job:created", job);
  return { job: publicJob(job), offers: [] as Offer[] };
}

export function raisePrice(jobId: string, customerId: string, price: number): void {
  const job = getJob(jobId);
  assertCustomer(job, customerId);
  if (job.status !== "open") throw new HttpError(409, "This request is no longer open.");
  if (!(price > 0)) throw new HttpError(400, "Enter a price above zero.");
  job.price = price;
  job.counters = {};
  saveJob(job);
  broadcast(job);
  events.emit("job:price", job);
}

export type OfferInput = Pick<Offer, "workerId" | "name" | "avatar" | "rating" | "jobs" | "price" | "coordinates" | "message">;

export function submitOffer(jobId: string, input: OfferInput): Offer {
  const job = getJob(jobId);
  if (job.status !== "open") throw new HttpError(409, "This request is no longer open.");
  if (job.customerId === input.workerId) throw new HttpError(400, "You cannot bid on your own request.");
  if (!(input.price > 0)) throw new HttpError(400, "Enter a price above zero.");
  const existing = offersFor(job.id).find(offer => offer.workerId === input.workerId && offer.status === "pending");
  const km = distanceKm(input.coordinates, job.coordinates);
  const offer = store.put<Offer>("offers", {
    ...input,
    id: existing?.id ?? newId("offer"),
    jobId: job.id,
    minutesAway: Math.max(2, Math.round(km * 3)),
    distanceKm: Math.round(km * 10) / 10,
    status: "pending",
  });
  broadcast(job);
  events.emit("offer:created", job, offer);
  return offer;
}

export function declineOffer(jobId: string, offerId: string, customerId: string, counter?: number): void {
  const job = getJob(jobId);
  assertCustomer(job, customerId);
  const offer = getOffer(job, offerId);
  offer.status = "declined";
  store.put("offers", offer);
  job.counters = { ...job.counters };
  if (counter) job.counters[offer.workerId] = counter;
  else delete job.counters[offer.workerId];
  saveJob(job);
  publish(`job:${job.id}:${offer.workerId}`, { type: "offer_declined", offerId, counter });
  broadcast(job);
  events.emit("offer:declined", job, offer, counter);
}

export const pendingOffers = (jobId: string) => offersFor(jobId).filter(offer => offer.status === "pending");

export function updateAgent(
  jobId: string,
  patch: Partial<Pick<AgentState, "status" | "offerId">>,
  note?: string,
  worker?: Pick<Offer, "name" | "avatar"> & Partial<Offer>,
): void {
  const job = getJob(jobId);
  if (!job.agent) return;
  Object.assign(job.agent, patch);
  // A line that carries an offer is always kept: two workers may say the same words.
  if (note && (worker?.price != null || job.agent.log.at(-1)?.text !== note)) {
    const offer = worker?.price != null && worker.id ? worker : null;
    job.agent.log.push({
      text: note,
      at: Date.now(),
      from: worker ? "worker" : "doyo",
      name: worker?.name,
      avatar: worker?.avatar,
      workerId: worker?.workerId ?? (worker && "id" in worker && typeof worker.id === "string" && worker.id.startsWith("sim-") ? worker.id : undefined),
      ...(offer ? { offerId: offer.id, price: offer.price, rating: offer.rating, jobs: offer.jobs, minutesAway: offer.minutesAway } : {}),
    });
  }
  saveJob(job);
  broadcast(job);
}

export function stopAgent(jobId: string, customerId: string): void {
  const job = getJob(jobId);
  assertCustomer(job, customerId);
  // The status bar shows the customer is choosing; a chat line would only shove the thread up.
  if (job.agent?.status === "working") updateAgent(jobId, { status: "stopped" });
}

/** Hands negotiation back to Doyo after the customer took over. Returns whether it restarted. */
export function resumeAgent(jobId: string, customerId: string): boolean {
  const job = getJob(jobId);
  assertCustomer(job, customerId);
  if (job.status !== "open" || job.agent?.status !== "stopped") return false;
  updateAgent(jobId, { status: "working" }, "Back on it.");
  return true;
}

export function cancelOffer(jobId: string, offerId: string, workerId: string): void {
  const job = getJob(jobId);
  const offer = getOffer(job, offerId);
  if (offer.workerId !== workerId) throw new HttpError(403, "This is not your offer.");
  offer.status = "cancelled";
  store.put("offers", offer);
  broadcast(job);
}

export function acceptOffer(jobId: string, offerId: string, customerId: string): Offer {
  const job = getJob(jobId);
  assertCustomer(job, customerId);
  if (job.status !== "open") throw new HttpError(409, "This request is no longer open.");
  const accepted = getOffer(job, offerId);
  if (accepted.status !== "pending") throw new HttpError(409, "This offer is no longer available.");
  const limit = job.paypalHold?.amount ?? job.agent?.budget;
  if (limit && accepted.price > limit) throw new HttpError(409, "This offer is above your limit.");
  for (const offer of offersFor(job.id)) {
    offer.status = offer.id === offerId ? "accepted" : offer.status === "pending" ? "rejected" : offer.status;
    store.put("offers", offer);
  }
  job.status = "assigned";
  job.acceptedWorkerId = accepted.workerId;
  job.acceptedPrice = accepted.price;
  job.workerPhase = "enroute";
  job.workerLocation = accepted.coordinates;
  job.workerLocationUpdatedAt = Date.now();
  job.startCode = DEMO_START_CODE;
  saveJob(job);
  broadcast(job);
  const result = { ...accepted, status: "accepted" as const };
  events.emit("offer:accepted", job, result);
  return result;
}

export function cancelJob(jobId: string, userId: string, reason?: string): void {
  const job = getJob(jobId);
  const role: Role | null = job.customerId === userId ? "customer" : job.acceptedWorkerId === userId ? "worker" : null;
  if (!role) throw new HttpError(403, "This is not your job.");
  if (!["open", "assigned", "in_progress"].includes(job.status)) throw new HttpError(409, "This job has already ended.");
  job.status = "cancelled";
  job.cancelledBy = role;
  job.cancelReason = reason ?? null;
  job.endedAt = Date.now();
  saveJob(job);
  broadcast(job);
  events.emit("job:ended", job);
}

export function updatePhase(jobId: string, workerId: string, phase: Phase): void {
  const job = getJob(jobId);
  assertAssignedWorker(job, workerId);
  job.workerPhase = phase;
  saveJob(job);
  broadcast(job);
  events.emit("job:phase", job);
}

export function startJob(jobId: string, workerId: string, code: string) {
  const job = getJob(jobId);
  assertAssignedWorker(job, workerId);
  if (job.status !== "assigned") throw new HttpError(409, "This job cannot be started now.");
  if (job.startCode !== code) throw new HttpError(400, "That code is not correct.");
  job.status = "in_progress";
  job.workerPhase = "working";
  job.startedAt = Date.now();
  saveJob(job);
  broadcast(job);
  return jobFor(job, workerId);
}

export function completeJob(jobId: string, workerId: string): void {
  const job = getJob(jobId);
  assertAssignedWorker(job, workerId);
  if (job.status !== "in_progress") throw new HttpError(409, "This job has not started.");
  job.status = "completed";
  job.workerPhase = "completed";
  job.endedAt = Date.now();
  saveJob(job);
  addPoints(job.customerId, POINTS_PER_BOOKING, "Booking completed", job.detail);
  recordEarning(job);
  broadcast(job);
  events.emit("job:ended", job);
}

export function rateJob(jobId: string, userId: string, rating: number, compliments: string[]): void {
  const job = getJob(jobId);
  const role: Role | null = job.customerId === userId ? "customer" : job.acceptedWorkerId === userId ? "worker" : null;
  if (!role) throw new HttpError(403, "This is not your job.");
  if (job.status !== "completed") throw new HttpError(409, "You can rate a job once it is finished.");
  if (!(rating >= 1 && rating <= 5)) throw new HttpError(400, "Choose between 1 and 5 stars.");
  const firstRating = !job.ratings[role];
  job.ratings[role] = { rating, compliments, ratedAt: Date.now() };
  saveJob(job);
  if (role === "customer" && rating === 5 && firstRating) addPoints(userId, POINTS_PER_FIVE_STAR, "5-star review", job.detail);
  broadcast(job);
}

export function setWorkerLocation(jobId: string, workerId: string, coordinates: LngLat): void {
  const job = getJob(jobId);
  assertAssignedWorker(job, workerId);
  job.workerLocation = coordinates;
  job.workerLocationUpdatedAt = Date.now();
  saveJob(job);
  publish(`job:${job.id}:${job.customerId}`, { type: "worker_location", coordinates });
}

export function listChat(jobId: string, userId: string): ChatMessage[] {
  const job = getJob(jobId);
  if (userId !== job.customerId && userId !== job.acceptedWorkerId) throw new HttpError(403, "This is not your job.");
  return job.chat;
}

export function sendChat(jobId: string, userId: string, text: string): ChatMessage[] {
  const job = getJob(jobId);
  const role: Role | null = job.customerId === userId ? "customer" : job.acceptedWorkerId === userId ? "worker" : null;
  if (!role) throw new HttpError(403, "This is not your job.");
  const body = text.trim().slice(0, 1000);
  if (!body) throw new HttpError(400, "Write a message first.");
  const message: ChatMessage = { id: newId("msg"), senderId: userId, senderRole: role, text: body, createdAt: Date.now() };
  job.chat.push(message);
  saveJob(job);
  for (const id of [job.customerId, job.acceptedWorkerId]) if (id) publish(`job:${job.id}:${id}`, { type: "chat", messages: job.chat });
  events.emit("chat:message", job, message);
  return job.chat;
}

export function dismissJob(jobId: string, workerId: string): void {
  snoozed.set(`${jobId}:${workerId}`, Date.now() + DECLINE_SNOOZE_MS);
  publishMarket();
}

export function setViewers(job: Job, count: number): void {
  const sample = Array.from({ length: Math.min(count, 3) }, (_, index) => ({ avatar: index % 2 ? "female" : "male", photo: null }));
  publish(`job:${job.id}:${job.customerId}`, { type: "viewers", viewers: { count, sample } });
}

export const SIM_CUSTOMER_PREFIX = "sim-customer-";

function canSee(job: Job, worker: Presence, now: number): boolean {
  if (job.status !== "open" || job.customerId === worker.id) return false;
  // A simulated request is for the worker it was made for.
  if (job.customerId.startsWith(SIM_CUSTOMER_PREFIX) && job.customerId !== `${SIM_CUSTOMER_PREFIX}${worker.id}`) return false;
  if ((snoozed.get(`${job.id}:${worker.id}`) ?? 0) > now) return false;
  if (worker.services.length && !worker.services.includes(job.service)) return false;
  return job.workerPreference === "Any" || job.workerPreference.toLowerCase() === worker.gender.toLowerCase();
}

export const hasHumanWorkers = (job: Job) => [...online.values()].some(worker => canSee(job, worker, Date.now()));

function marketJobsFor(worker: Presence) {
  const now = Date.now();
  return store
    .list<Job>("jobs")
    .filter(job => canSee(job, worker, now))
    .map(job => {
      const km = worker.coordinates ? distanceKm(worker.coordinates, job.coordinates) : 3;
      return { ...jobFor(job, worker.id), counterPrice: job.counters?.[worker.id] ?? null, distanceKm: Math.round(km * 10) / 10, minutesAway: Math.max(2, Math.round(km * 3)) };
    });
}

export function publishMarket(): void {
  for (const worker of online.values()) publish(`market:${worker.id}`, { type: "jobs", jobs: marketJobsFor(worker) });
}

export function goOnline(worker: Presence, send?: (msg: object) => void): void {
  const wasOnline = online.has(worker.id);
  online.set(worker.id, worker);
  send?.({ type: "jobs", jobs: marketJobsFor(worker) });
  if (!wasOnline) events.emit("worker:online", worker);
}

export function goOffline(workerId: string): void {
  online.delete(workerId);
}

export function activeJobFor(workerId: string) {
  const job = store.list<Job>("jobs").find(item => item.acceptedWorkerId === workerId && ["assigned", "in_progress"].includes(item.status));
  return job ? jobFor(job, workerId) : null;
}

export function expireOpenJobs(): void {
  const cutoff = Date.now() - JOB_OPEN_MS;
  for (const job of store.list<Job>("jobs")) {
    if (job.status === "open" && job.createdAt < cutoff) {
      job.status = "cancelled";
      job.cancelReason = "No worker was accepted in time.";
      job.endedAt = Date.now();
      saveJob(job);
      broadcast(job);
      events.emit("job:ended", job);
    }
  }
}

export function bookingHistory(customerId: string) {
  return store
    .list<Job>("jobs")
    .filter(job => job.customerId === customerId && (job.status === "completed" || job.status === "cancelled"))
    .sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))
    .map(job => {
      const offer = offersFor(job.id).find(item => item.status === "accepted");
      const endedAt = job.endedAt ?? job.createdAt;
      return {
        id: job.id,
        workerName: offer?.name ?? "",
        workerRating: offer?.rating ?? "",
        workerJobs: offer?.jobs ?? "",
        workerPhoto: offer ? `/api/worker-photo/${encodeURIComponent(offer.workerId)}` : null,
        service: job.service,
        detail: job.detail,
        address: job.address,
        details: job.details,
        coordinates: job.coordinates,
        workerPreference: job.workerPreference,
        price: job.acceptedPrice ?? job.price,
        paymentMethod: job.payment,
        status: job.status,
        cancelledBy: job.cancelledBy,
        startedAt: job.startedAt,
        endedAt,
        durationMinutes: job.startedAt ? Math.round((endedAt - job.startedAt) / 60_000) : null,
        at: endedAt,
      };
    });
}

export const completedBookings = (customerId: string) =>
  store.list<Job>("jobs").filter(job => job.customerId === customerId && job.status === "completed").length;

const average = (ratings: number[]) => (ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : 5);

function customerRating(customerId: string): string {
  const given = store.list<Job>("jobs").filter(job => job.customerId === customerId && job.ratings.worker);
  return average(given.map(job => job.ratings.worker!.rating)).toFixed(1);
}

export function workerStats(workerId: string) {
  const rated = store.list<Job>("jobs").filter(job => job.acceptedWorkerId === workerId && job.ratings.customer);
  return { rating: average(rated.map(job => job.ratings.customer!.rating)).toFixed(1), ratingCount: rated.length };
}

const loyaltyOf = (customerId: string) => store.get<Loyalty>("loyalty", customerId) ?? { id: customerId, points: 0, transactions: [], owned: [] };

export function loyalty(customerId: string) {
  const { id: _id, ...data } = loyaltyOf(customerId);
  const now = Date.now();
  return {
    ...data,
    transactions: [...data.transactions].sort((a, b) => b.at - a.at),
    owned: data.owned.filter(reward => reward.expiresAt > now).sort((a, b) => a.expiresAt - b.expiresAt),
  };
}

export function addPoints(customerId: string, points: number, label: string, sub?: string): void {
  const account = loyaltyOf(customerId);
  account.points += points;
  account.transactions.push({ id: newId("txn"), type: "earn", label, sub, points, at: Date.now() });
  store.put("loyalty", account);
}

export function redeemReward(customerId: string, key: keyof typeof REWARDS) {
  const reward = REWARDS[key];
  if (!reward) throw new HttpError(400, "That reward does not exist.");
  const account = loyaltyOf(customerId);
  if (account.points < reward.points) throw new HttpError(400, "You do not have enough points yet.");
  account.points -= reward.points;
  account.transactions.push({ id: newId("txn"), type: "redeem", label: reward.label, points: reward.points, at: Date.now() });
  account.owned.push({ id: newId("reward"), key, label: reward.label, amountOff: reward.amountOff, expiresAt: Date.now() + REWARD_LIFETIME_MS });
  store.put("loyalty", account);
  return { ok: true, reward: key, ...loyalty(customerId) };
}

function spendReward(customerId: string, rewardId: string): void {
  const account = loyaltyOf(customerId);
  const before = account.owned.length;
  account.owned = account.owned.filter(reward => reward.id !== rewardId);
  if (account.owned.length === before) throw new HttpError(400, "That reward is no longer available.");
  store.put("loyalty", account);
}

const ledgerOf = (workerId: string) => store.get<Ledger>("ledgers", workerId) ?? { id: workerId, commissionDue: 0, transactions: [] };

function recordEarning(job: Job): void {
  const workerId = job.acceptedWorkerId!;
  const price = job.acceptedPrice ?? job.price;
  const commission = Math.round(price * COMMISSION_RATE);
  const ledger = ledgerOf(workerId);
  const at = Date.now();
  // A PayPal job's commission comes out of the charge; only cash leaves it owed.
  if (job.payment !== "PayPal") ledger.commissionDue += commission;
  ledger.transactions.push(
    { id: newId("ltx"), label: "Job completed", sub: job.detail, at, amount: price, type: "earning" },
    { id: newId("ltx"), label: "Doyo commission", sub: job.detail, at, amount: -commission, type: "commission" },
  );
  store.put("ledgers", ledger);
}

export function setPaymentStatus(jobId: string, paymentStatus: Job["paymentStatus"]): void {
  const job = getJob(jobId);
  job.paymentStatus = paymentStatus;
  saveJob(job);
  broadcast(job);
}

export function workerShare(job: Job): number {
  const price = job.acceptedPrice ?? job.price;
  return price - Math.round(price * COMMISSION_RATE);
}

export function recordPayout(workerId: string, amount: number, detail: string): void {
  const ledger = ledgerOf(workerId);
  ledger.transactions.push({ id: newId("ltx"), label: "Sent to your PayPal", sub: detail, at: Date.now(), amount, type: "payout" });
  store.put("ledgers", ledger);
}

export function earnings(workerId: string) {
  const ledger = ledgerOf(workerId);
  const jobsIn = (from: number) => ledger.transactions.filter(txn => txn.type === "earning" && txn.at >= from);
  const total = (txns: LedgerTxn[]) => txns.reduce((sum, txn) => sum + txn.amount, 0);
  const startOfDay = new Date().setHours(0, 0, 0, 0);
  const today = jobsIn(startOfDay);
  const week = jobsIn(startOfDay - 6 * 86_400_000);
  const all = jobsIn(0);
  return {
    totalEarned: total(all),
    commissionDue: ledger.commissionDue,
    jobsCompleted: all.length,
    today: total(today),
    todayJobs: today.length,
    week: total(week),
    weekJobs: week.length,
    transactions: [...ledger.transactions].sort((a, b) => b.at - a.at),
  };
}

export function settleCommission(workerId: string, amount?: number) {
  const ledger = ledgerOf(workerId);
  const paid = Math.min(amount ?? ledger.commissionDue, ledger.commissionDue);
  if (paid > 0) {
    ledger.commissionDue -= paid;
    ledger.transactions.push({ id: newId("ltx"), label: "Commission top-up", sub: "PayPal", at: Date.now(), amount: paid, type: "topup" });
    store.put("ledgers", ledger);
  }
  return earnings(workerId);
}

export function deleteUserData(userId: string): void {
  store.del("users", userId);
  store.del("loyalty", userId);
  store.del("ledgers", userId);
  online.delete(userId);
}
