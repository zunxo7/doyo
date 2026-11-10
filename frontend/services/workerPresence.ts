import * as SecureStore from "expo-secure-store";
import type { MarketPresence } from "./bidding";

const ONLINE_KEY = "doyo_worker_online";
const PROFILE_KEY = "doyo_worker_presence_profile";
const PENDING_OFFLINE_KEY = "doyo_worker_offline_pending";
const ACTIVE_JOB_KEY = "doyo_worker_active_job";

export type StoredPresence = MarketPresence & { workerId: string };

let online = false;
let ready = false;

async function hydrate(): Promise<void> {
  online = (await SecureStore.getItemAsync(ONLINE_KEY).catch(() => null)) === "1";
  ready = true;
}

export const hydrateWorkerPresence = hydrate();

export const isWorkerPresenceReady = () => ready;

export const getWorkerOnline = () => online;

export function setWorkerOnline(value: boolean): void {
  if (online === value) return;
  online = value;
  SecureStore.setItemAsync(ONLINE_KEY, value ? "1" : "0").catch(() => undefined);
}

async function storeOrClear(key: string, value: string | null): Promise<void> {
  const write = value ? SecureStore.setItemAsync(key, value) : SecureStore.deleteItemAsync(key);
  await write.catch(() => undefined);
}

export const saveWorkerPresenceProfile = (profile: StoredPresence) => storeOrClear(PROFILE_KEY, JSON.stringify(profile));

export const saveWorkerActiveJob = (jobId: string | null) => storeOrClear(ACTIVE_JOB_KEY, jobId);

export const setPendingOffline = (workerId: string | null) => storeOrClear(PENDING_OFFLINE_KEY, workerId);

export function getPendingOffline(): Promise<string | null> {
  return SecureStore.getItemAsync(PENDING_OFFLINE_KEY).catch(() => null);
}
