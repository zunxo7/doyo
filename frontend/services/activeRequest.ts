import * as SecureStore from "expo-secure-store";
import type { Offer } from "../components/OffersOverlay";
import { pickAcceptedOffer, requestJson, type JobSnapshot } from "./bidding";

const STORAGE_KEY = "doyo_active_request";
const LIVE_STATUSES = ["open", "assigned", "in_progress"];

export type ActiveRequest = { jobId: string; customerId: string };

// Only "gone" may clear local state; "unknown" means the server could not be asked.
export type LiveRequestResult =
  | { request: ActiveRequest; job: JobSnapshot; acceptedOffer: Offer | null }
  | "gone"
  | "unknown";

export async function saveActiveRequest(request: ActiveRequest | null): Promise<void> {
  const write = request ? SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(request)) : SecureStore.deleteItemAsync(STORAGE_KEY);
  await write.catch(() => undefined);
}

export async function loadActiveRequest(): Promise<ActiveRequest | null> {
  try {
    const stored = await SecureStore.getItemAsync(STORAGE_KEY);
    const request = stored ? (JSON.parse(stored) as ActiveRequest) : null;
    return request?.jobId && request.customerId ? request : null;
  } catch {
    return null;
  }
}

export async function fetchLiveRequest(request: ActiveRequest): Promise<LiveRequestResult> {
  try {
    const { job, offers } = await requestJson<{ job?: JobSnapshot; offers?: unknown }>(`/api/jobs/${encodeURIComponent(request.jobId)}`);
    if (!job || !LIVE_STATUSES.includes(job.status)) return "gone";
    return { request, job, acceptedOffer: pickAcceptedOffer(offers) };
  } catch (error) {
    return (error as { status?: number }).status === 404 ? "gone" : "unknown";
  }
}
