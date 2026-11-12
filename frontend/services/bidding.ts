import { File } from "expo-file-system";
import type { Offer } from "../components/OffersOverlay";
import { API_BASE_URL } from "./apiBase";
import { getSessionToken, getStoredSessionToken, getStoredUser, saveSessionToken, saveUser, sessionTokenExpired, sessionTokenSubject } from "./auth";
import { handleUnauthorized } from "./authFailure";
import { openLiveChannel, type LiveSocket, type LiveStatus } from "./liveSocket";
import type { LngLat } from "./routing";
import type { WorkerJob, WorkerTxn } from "./workerJobs";

type ServiceKey = "home" | "vehicle" | "furniture" | "laundry" | "barber";
type Payment = "PayPal" | "Cash";
type Role = "customer" | "worker";
type RewardKey = "free_2000_job" | "discount_1000" | "discount_500";

export type WorkerPhase = "enroute" | "arrived" | "working" | "completed";

export type RatingSnapshot = {
  rating: number;
  compliments: string[];
  ratedAt: number | null;
};

export type JobDetails = {
  service: ServiceKey;
  rooms?: number;
  cleaningType?: "Regular" | "Deep";
  vehicles?: { type: string; count: number }[];
  smallItems?: number;
  bigItems?: number;
  haircut?: number;
  beard?: number;
  haircutBeard?: number;
};

export type JobAgent = {
  status: "working" | "booked" | "stopped";
  budget: number;
  offerId: string | null;
  log: {
    text: string;
    at: number;
    from: "doyo" | "worker";
    name?: string;
    avatar?: "male" | "female";
    offerId?: string;
    workerId?: string;
    price?: number;
    rating?: string;
    jobs?: string;
    minutesAway?: number;
    bookedBefore?: number;
    lastStars?: number | null;
  }[];
};

export type AgentPlan = {
  understood: boolean;
  cancel: boolean;
  question: string;
  reply: string;
  service: "home" | "vehicle" | "furniture" | "barber";
  rooms: number;
  cleaningType: "Regular" | "Deep";
  cars: number;
  bikes: number;
  vans: number;
  smallItems: number;
  bigItems: number;
  haircuts: number;
  beards: number;
  haircutAndBeards: number;
  workerPreference: "Any" | "Male" | "Female";
  budget: number;
};

export type JobSnapshot = {
  id: string;
  createdAt?: number;
  customerId: string;
  customerName: string;
  customerPhoto?: string | null;
  customerRating?: string | null;
  service: ServiceKey | string;
  detail: string;
  address: string;
  city: string;
  coordinates: LngLat | null;
  price: number;
  payment: Payment;
  workerPreference: "Male" | "Female" | "Any";
  notes: string;
  details: JobDetails | null;
  status: string;
  paymentStatus?: "paid" | "failed";
  cancelReason?: string | null;
  cancelledBy?: Role | null;
  acceptedWorkerId?: string | null;
  acceptedPrice?: number | null;
  workerLocation?: LngLat | null;
  workerLocationUpdatedAt?: number | null;
  workerPhase?: WorkerPhase | null;
  startCode?: string | null;
  startedAt?: number | null;
  shareCode?: string | null;
  agent?: JobAgent | null;
  ratings?: {
    customer: RatingSnapshot | null;
    worker: RatingSnapshot | null;
  };
};

export type ChatMessageSnapshot = {
  id: string;
  senderId: string;
  senderRole: Role;
  text: string;
  createdAt: number;
};

type OfferSnapshot = {
  id: string;
  workerId: string;
  name: string;
  avatar: "male" | "female";
  rating: string;
  jobs: string;
  price: number;
  minutesAway: number;
  distanceKm: number;
  status: string;
};

export type CreateJobInput = {
  customerId: string;
  customerName: string;
  customerPhoto?: string | null;
  service: ServiceKey;
  detail: string;
  address: string;
  city?: string;
  coordinates: LngLat;
  price: number;
  payment: Payment;
  workerPreference: "Male" | "Female" | "Any";
  notes?: string;
  details?: JobDetails;
  rewardId?: string;
  agentBudget?: number;
  paypalHoldId?: string;
};

export type WorkerOfferInput = {
  workerId: string;
  workerName: string;
  coordinates: LngLat;
  price: number;
  workerRating?: string;
  workerJobs?: string;
};

export type SupportReportInput = {
  category: string;
  details: string;
  attachmentUri?: string | null;
};

export type CustomerBookingHistoryItem = {
  id: string;
  workerName: string;
  workerRating: string;
  workerJobs: string;
  workerPhoto: string | null;
  service: string;
  detail: string;
  address: string;
  details: JobDetails | null;
  coordinates: LngLat | null;
  workerPreference: "Male" | "Female" | "Any";
  price: number;
  paymentMethod: string;
  status: "completed" | "cancelled";
  cancelledBy?: Role | null;
  startedAt: number | null;
  endedAt: number;
  durationMinutes: number | null;
  at: number;
};

export type LoyaltyTransaction = {
  id: string;
  type: "earn" | "redeem";
  label: string;
  sub?: string | null;
  points: number;
  at: number;
};

export type OwnedReward = {
  id: string;
  key: RewardKey;
  label: string;
  amountOff: number;
  expiresAt: number;
};

export type CustomerLoyalty = {
  points: number;
  transactions: LoyaltyTransaction[];
  owned: OwnedReward[];
};

export type WorkerEarnings = {
  totalEarned: number;
  commissionDue: number;
  jobsCompleted: number;
  today: number;
  todayJobs: number;
  week: number;
  weekJobs: number;
  transactions: WorkerTxn[];
};

export type ViewerInfo = { count: number; sample: { avatar: "male" | "female"; photo: string | null }[] };

export type JobRoomHandlers = {
  onState?: (job: JobSnapshot | null, offers: Offer[]) => void;
  onWorkerLocation?: (coordinates: LngLat) => void;
  onViewers?: (viewers: ViewerInfo) => void;
  onChat?: (messages: ChatMessageSnapshot[]) => void;
  onOfferDeclined?: (offerId: string, counter?: number) => void;
  onStatus?: (status: LiveStatus) => void;
};

export type MarketPresence = {
  city?: string;
  services?: ServiceKey[];
  coordinates?: LngLat;
  gender?: string;
  avatar?: "male" | "female";
  rating?: string;
  jobs?: string;
  photo?: string;
  name?: string;
};

export const EMPTY_WORKER_EARNINGS: WorkerEarnings = {
  totalEarned: 0,
  commissionDue: 0,
  jobsCompleted: 0,
  today: 0,
  todayJobs: 0,
  week: 0,
  weekJobs: 0,
  transactions: [],
};

// The server hides a dismissed job from the worker for this long.
export const DECLINE_SNOOZE_MS = 500;

const OFFER_DEFAULT_RATING = "4.8";
const OFFER_DEFAULT_MINUTES = 6;
const JOB_DEFAULT_DISTANCE_KM = 3;
const JOB_DEFAULT_COORDINATES: LngLat = [73.0479, 33.6844];

const WORKER_SERVICE_NAMES: Record<string, { service: WorkerJob["service"]; detail: string }> = {
  home: { service: "Home Cleaning", detail: "Home cleaning" },
  vehicle: { service: "Vehicle Cleaning", detail: "Vehicle cleaning" },
  furniture: { service: "Furniture Shifting", detail: "Furniture shifting" },
  barber: { service: "Barber", detail: "Barber" },
};

const cleanId = (value: string) => value.replace(/[^a-zA-Z0-9._:-]/g, "").slice(0, 120);
const encoded = encodeURIComponent;
const jobPath = (jobId: string, suffix = "") => `/api/jobs/${encoded(jobId)}${suffix}`;
const offerPath = (jobId: string, offerId: string, action: string) => jobPath(jobId, `/offers/${encoded(offerId)}/${action}`);
const workerPath = (workerId: string, suffix: string) => `/api/workers/${encoded(workerId)}${suffix}`;

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getSessionToken();
  return token ? { "x-doyo-token": token } : {};
}

export async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = await authHeaders();
  if (init.body) headers["content-type"] = "application/json";
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const data = await response.json().catch(() => ({}));
  if (response.ok) return data as T;
  if (response.status === 401) void handleUnauthorized(path);
  const error: Error & { status?: number } = new Error(data?.error || `Doyo API failed with ${response.status}`);
  error.status = response.status;
  throw error;
}

// The server rejects an empty body sent as JSON, so every write carries an object.
const sendJson = <T = unknown>(method: "POST" | "PUT" | "DELETE", path: string, body: object = {}) =>
  requestJson<T>(path, { method, body: JSON.stringify(body) });

async function orDefault<T>(request: Promise<T>, fallback: T): Promise<T> {
  try {
    return await request;
  } catch {
    return fallback;
  }
}

export function workerPhotoUrl(workerId: string): string {
  // The version moves when the bundled worker photos change, so caches drop the old ones.
  return `${API_BASE_URL}/api/worker-photo/${encoded(workerId)}?v=2`;
}

export function getJobStatusShareUrl(codeOrJobId: string): string {
  return `${API_BASE_URL}/j/${encoded(cleanId(codeOrJobId))}`;
}

// The token's subject is the identity the server acts on.
export async function getCurrentUserId(fallbackName = "guest"): Promise<string> {
  const token = await getSessionToken();
  const subject = token ? sessionTokenSubject(token) : null;
  if (subject) return subject;
  const user = await getStoredUser();
  if (user?.email) return cleanId(user.email.toLowerCase());
  return user?.id || `${fallbackName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "guest"}-local`;
}

export async function refreshSessionToken(): Promise<void> {
  const token = await getStoredSessionToken();
  if (!token || sessionTokenExpired(token)) return;
  const refreshed = await orDefault(sendJson<{ token?: string }>("POST", "/api/session/refresh"), {});
  if (refreshed.token && refreshed.token !== token) await saveSessionToken(refreshed.token);
}

// The backend stores no attachment, so a screenshot is not uploaded.
export async function submitSupportReport({ category, details }: SupportReportInput): Promise<void> {
  await sendJson("POST", "/api/support-reports", { category, details });
}

export async function fetchCustomerBookings(_customerId: string): Promise<number> {
  const { bookings } = await orDefault(requestJson<{ bookings?: number }>("/api/customer-stats"), {});
  return bookings ?? 0;
}

export async function fetchCustomerBookingHistory(_customerId: string): Promise<CustomerBookingHistoryItem[]> {
  const { bookings = [] } = await orDefault(requestJson<{ bookings?: CustomerBookingHistoryItem[] }>("/api/customer-bookings"), {});
  return bookings.map(booking => ({
    ...booking,
    workerPhoto: booking.workerPhoto?.startsWith("/") ? `${API_BASE_URL}${booking.workerPhoto}` : booking.workerPhoto ?? null,
  }));
}

export async function fetchWorkerServices(workerId: string): Promise<string[]> {
  const { services } = await requestJson<{ services?: string[] }>(workerPath(workerId, "/services"));
  return services ?? [];
}

export async function updateWorkerServices(workerId: string, services: string[]): Promise<string[]> {
  const saved = await sendJson<{ services?: string[] }>("PUT", workerPath(workerId, "/services"), { services });
  return saved.services ?? services;
}

export async function fetchCustomerLoyalty(_customerId: string): Promise<CustomerLoyalty> {
  const loyalty = await orDefault(requestJson<Partial<CustomerLoyalty>>("/api/customer-loyalty"), {});
  return { points: loyalty.points ?? 0, transactions: loyalty.transactions ?? [], owned: loyalty.owned ?? [] };
}

export function redeemCustomerReward(
  _customerId: string,
  reward: RewardKey,
): Promise<CustomerLoyalty & { ok?: boolean; error?: string; reward?: string }> {
  return sendJson("POST", "/api/customer-loyalty/redeem", { reward });
}


export async function fetchWorkerStats(workerId: string): Promise<{ rating: string; ratingCount: number }> {
  const stats = await orDefault(
    requestJson<{ rating?: string; ratingCount?: number }>(`/api/worker-stats?id=${encoded(workerId)}`),
    {},
  );
  return { rating: stats.rating ?? "5.0", ratingCount: stats.ratingCount ?? 0 };
}

type EarningsResponse = Omit<WorkerEarnings, "transactions"> & { transactions?: Omit<WorkerTxn, "date">[] };

function toWorkerEarnings(earnings: EarningsResponse): WorkerEarnings {
  const transactions = (earnings.transactions ?? []).map(txn => ({
    ...txn,
    date: new Date(txn.at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));
  return { ...EMPTY_WORKER_EARNINGS, ...earnings, transactions };
}

export async function fetchWorkerEarnings(_workerId: string): Promise<WorkerEarnings> {
  try {
    return toWorkerEarnings(await requestJson<EarningsResponse>("/api/worker-earnings"));
  } catch {
    return EMPTY_WORKER_EARNINGS;
  }
}

async function uploadPhoto(localUri: string): Promise<string | null> {
  try {
    const file = new File(localUri);
    if (!file.exists) return null;
    const userId = await getCurrentUserId();
    const response = await fetch(`${API_BASE_URL}${workerPath(userId, "/photo")}`, {
      method: "PUT",
      headers: { ...(await authHeaders()), "content-type": "image/webp" },
      body: await file.bytes(),
    });
    if (response.status === 401) void handleUnauthorized("workers/photo");
    return response.ok ? workerPhotoUrl(userId) : null;
  } catch {
    return null;
  }
}

export const uploadWorkerPhoto = (_workerId: string, localUri: string) => uploadPhoto(localUri);
export const uploadCustomerPhoto = (_customerId: string, localUri: string) => uploadPhoto(localUri);

function toOffer(offer: OfferSnapshot): Offer {
  return {
    id: offer.id,
    name: offer.name,
    rating: offer.rating || OFFER_DEFAULT_RATING,
    jobs: offer.jobs || "0",
    minutesAway: offer.minutesAway || OFFER_DEFAULT_MINUTES,
    price: offer.price,
    avatar: offer.avatar === "female" ? "female" : "male",
    photo: offer.workerId ? workerPhotoUrl(offer.workerId) : undefined,
  };
}

const toLiveOffers = (offers: OfferSnapshot[]) =>
  offers.filter(({ status }) => status === "pending" || status === "accepted").map(toOffer);

export function pickAcceptedOffer(offers: unknown): Offer | null {
  if (!Array.isArray(offers)) return null;
  const accepted = (offers as OfferSnapshot[]).find(offer => offer?.status === "accepted");
  return accepted ? toOffer(accepted) : null;
}

export async function createBiddingJob(input: CreateJobInput): Promise<{ job: JobSnapshot; offers: Offer[] }> {
  const { job, offers } = await sendJson<{ job: JobSnapshot; offers?: OfferSnapshot[] }>("POST", "/api/jobs", input);
  return { job, offers: toLiveOffers(offers ?? []) };
}

export async function raiseJobPrice(jobId: string, _customerId: string, price: number): Promise<void> {
  await sendJson("POST", jobPath(jobId, "/price"), { price });
}

export type ChatLine = { from: "customer" | "doyo"; text: string };

export function planAgentRequest(text: string, plan: AgentPlan | null, recent: ChatLine[] = [], usualPrice?: number): Promise<AgentPlan> {
  return sendJson<AgentPlan>("POST", "/api/agent/plan", { text, plan, recent, usualPrice });
}

export async function stopJobAgent(jobId: string): Promise<void> {
  await sendJson("POST", jobPath(jobId, "/agent/stop"));
}

export async function declineBiddingOffer(jobId: string, offerId: string, _customerId: string, counter?: number): Promise<void> {
  await sendJson("POST", offerPath(jobId, offerId, "decline"), counter ? { counter } : {});
}

export async function resumeJobAgent(jobId: string): Promise<void> {
  await sendJson("POST", jobPath(jobId, "/agent/resume"));
}

export async function acceptBiddingOffer(jobId: string, offerId: string, _customerId: string): Promise<Offer> {
  const { acceptedOffer } = await sendJson<{ acceptedOffer: OfferSnapshot }>("POST", offerPath(jobId, offerId, "accept"));
  return toOffer(acceptedOffer);
}

export async function cancelBiddingJob(jobId: string, _actorId: string, _role: Role, reason?: string): Promise<void> {
  await sendJson("POST", jobPath(jobId, "/cancel"), { reason });
}

export async function advanceReviewDemo(_actorId: string, _role: Role): Promise<{ ok: boolean; message?: string }> {
  try {
    await sendJson("POST", "/api/demo/advance");
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : undefined };
  }
}

/** Makes the signed-in account an approved worker; the demo has no application to review. */
export async function startDemoWorker(input: { email: string; name: string; phone: string }): Promise<void> {
  const { user } = await sendJson<{ user: { id: string } }>("POST", "/api/demo/worker", input);
  await saveUser({ ...input, id: user.id, role: "worker", onboardingStatus: "approved" });
}

export async function submitWorkerOffer(jobId: string, { workerId: _workerId, ...offer }: WorkerOfferInput): Promise<Offer> {
  const created = await sendJson<{ offer: OfferSnapshot }>("POST", jobPath(jobId, "/offers"), offer);
  return toOffer(created.offer);
}

export async function dismissJobForWorker(jobId: string, _workerId: string): Promise<void> {
  await sendJson("POST", jobPath(jobId, "/dismiss"));
}

export async function cancelWorkerOffer(jobId: string, offerId: string, _workerId: string): Promise<void> {
  await sendJson("POST", offerPath(jobId, offerId, "cancel"));
}

export function openJobRoomSocket(jobId: string, role: Role, userId: string, handlers: JobRoomHandlers): LiveSocket {
  return openLiveChannel({
    topic: `job:${jobId}`,
    params: { role, userId },
    onStatus: handlers.onStatus,
    onMessage: msg => {
      switch (msg.type) {
        case "state":
          handlers.onState?.(msg.ok ? (msg.job as JobSnapshot) : null, toLiveOffers(msg.offers ?? []));
          break;
        case "worker_location":
          if (Array.isArray(msg.coordinates)) handlers.onWorkerLocation?.(msg.coordinates as LngLat);
          break;
        case "viewers":
          if (msg.viewers) handlers.onViewers?.(msg.viewers as ViewerInfo);
          break;
        case "chat":
          if (Array.isArray(msg.messages)) handlers.onChat?.(msg.messages as ChatMessageSnapshot[]);
          break;
        case "offer_declined":
          handlers.onOfferDeclined?.(String(msg.offerId ?? ""), msg.counter);
          break;
      }
    },
  });
}

export function sendWorkerLocation(socket: LiveSocket, coordinates: LngLat): void {
  socket.send({ type: "location", coordinates });
}

export async function markWorkerOnline(workerId: string, presence: MarketPresence): Promise<void> {
  await sendJson("POST", workerPath(workerId, "/online"), presence);
}

export async function markWorkerOffline(workerId: string): Promise<void> {
  await sendJson("DELETE", workerPath(workerId, "/online"));
}

export function openMarketSocket(
  workerId: string,
  { coordinates, ...presence }: MarketPresence,
  handlers: { onJobs?: (jobs: WorkerJob[]) => void; onStatus?: (status: LiveStatus) => void },
): LiveSocket {
  return openLiveChannel({
    topic: `market:${workerId}`,
    params: { ...presence, services: presence.services ?? [], lng: coordinates?.[0], lat: coordinates?.[1] },
    onStatus: handlers.onStatus,
    onMessage: msg => {
      if (msg.type === "jobs") handlers.onJobs?.((msg.jobs ?? []).map(toWorkerJob));
    },
  });
}

export async function completeBiddingJob(jobId: string, _workerId: string): Promise<void> {
  await sendJson("POST", jobPath(jobId, "/complete"));
}

export async function startBiddingJob(jobId: string, _workerId: string, code: string): Promise<JobSnapshot> {
  const { job } = await sendJson<{ job: JobSnapshot }>("POST", jobPath(jobId, "/start"), { code });
  return job;
}

export async function updateWorkerPhase(jobId: string, _workerId: string, phase: WorkerPhase): Promise<void> {
  await sendJson("POST", jobPath(jobId, "/phase"), { phase });
}

export async function submitJobRating(
  jobId: string,
  _actorId: string,
  _role: Role,
  rating: number,
  compliments: string[],
): Promise<void> {
  await sendJson("POST", jobPath(jobId, "/rating"), { rating, compliments });
}

export async function deleteAccount(_userId: string, _role: Role): Promise<void> {
  await sendJson("POST", "/api/account/delete");
}

export async function listJobChat(jobId: string, _actorId: string): Promise<ChatMessageSnapshot[]> {
  const { messages } = await requestJson<{ messages?: ChatMessageSnapshot[] }>(jobPath(jobId, "/chat"));
  return messages ?? [];
}

export async function sendJobChatMessage(jobId: string, _actorId: string, _role: Role, text: string): Promise<ChatMessageSnapshot[]> {
  const { messages } = await sendJson<{ messages?: ChatMessageSnapshot[] }>("POST", jobPath(jobId, "/chat"), { text });
  return messages ?? [];
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

export function summarizeJobDetails(
  details: JobDetails | null | undefined,
  fallback = "",
  translate: Translate = key => key,
): string {
  const counted = (count: number, singular: string, plural = singular) => `${count} ${translate(count === 1 ? singular : plural)}`;

  switch (details?.service) {
    case "home": {
      const rooms = details.rooms ? [counted(details.rooms, "room", "rooms")] : [];
      const type = details.cleaningType ? [`${translate(details.cleaningType)} ${translate("clean")}`] : [];
      return [...rooms, ...type].join(" · ") || fallback;
    }
    case "vehicle":
      return (
        (details.vehicles ?? [])
          .filter(vehicle => vehicle.count > 0)
          .map(({ type, count }) => counted(count, type.toLowerCase(), `${type.toLowerCase()}s`))
          .join(" + ") || fallback
      );
    case "furniture": {
      const big = details.bigItems ? [counted(details.bigItems, "big item", "big items")] : [];
      const small = details.smallItems ? [counted(details.smallItems, "small item", "small items")] : [];
      return [...big, ...small].join(" + ") || fallback;
    }
    case "barber": {
      const cuts: [number | undefined, string][] = [
        [details.haircut, "haircut"],
        [details.beard, "beard"],
        [details.haircutBeard, "haircut + beard"],
      ];
      return (
        cuts
          .filter(([count]) => count)
          .map(([count, label]) => `${count} ${translate(label)}`)
          .join(" · ") || fallback
      );
    }
    default:
      return fallback;
  }
}

function toWorkerJob(job: JobSnapshot & { distanceKm?: number; minutesAway?: number; counterPrice?: number | null }): WorkerJob {
  const { service, detail } = WORKER_SERVICE_NAMES[job.service] ?? WORKER_SERVICE_NAMES.home;
  return {
    id: job.id,
    customerName: job.customerName || "Customer",
    customerPhoto: job.customerPhoto ?? (job.customerId ? workerPhotoUrl(job.customerId) : null),
    avatar: "male",
    service,
    detail: summarizeJobDetails(job.details, job.detail || detail),
    address: job.address,
    distanceKm: job.distanceKm ?? JOB_DEFAULT_DISTANCE_KM,
    minutesAway: job.minutesAway ?? OFFER_DEFAULT_MINUTES,
    price: job.price,
    counterPrice: job.counterPrice ?? null,
    payment: job.payment || "Cash",
    customerRating: job.customerRating ?? "5.0",
    workerPreference: job.workerPreference || "Any",
    notes: job.notes || "",
    details: job.details ?? null,
    coordinates: job.coordinates || JOB_DEFAULT_COORDINATES,
  };
}

// null means no active job; undefined means the server could not answer.
export async function fetchWorkerActiveJob(workerId: string): Promise<WorkerJob | null | undefined> {
  try {
    const { job } = await requestJson<{ job?: JobSnapshot | null }>(workerPath(workerId, "/active-job"));
    if (!job) return null;
    return {
      ...toWorkerJob(job),
      price: job.acceptedPrice ?? job.price,
      workerPhase: job.workerPhase ?? null,
      startedAt: job.startedAt ?? null,
    };
  } catch {
    return undefined;
  }
}
