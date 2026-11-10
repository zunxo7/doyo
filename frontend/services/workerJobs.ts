import type { JobDetails, WorkerPhase } from "./bidding";
import type { LngLat } from "./routing";

export type WorkerJob = {
  id: string;
  customerName: string;
  customerPhoto?: string | null;
  avatar: "male" | "female";
  service: "Home Cleaning" | "Vehicle Cleaning" | "Furniture Shifting" | "Barber";
  detail: string;
  address: string;
  distanceKm: number;
  minutesAway: number;
  price: number;
  /** A lower price asked of this worker alone; replaces price on their card. */
  counterPrice?: number | null;
  payment: "PayPal" | "Cash";
  customerRating: string;
  workerPreference: "Male" | "Female" | "Any";
  notes: string;
  details?: JobDetails | null;
  coordinates: LngLat;
  workerPhase?: WorkerPhase | null;
  startedAt?: number | null;
};

export type WorkerTxnType = "earning" | "commission" | "topup" | "payout";

export type WorkerTxn = {
  id: string;
  label: string;
  sub: string;
  date: string;
  at: number;
  // Credits are positive; commission owed is negative.
  amount: number;
  type: WorkerTxnType;
};

export const WORKER_COMMISSION_LIMIT = 500;

export const WORKER_STATS = {
  rating: "5.0",
};
