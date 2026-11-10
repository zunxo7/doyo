import * as SecureStore from "expo-secure-store";

const STORAGE_KEY = "doyo_chat_read";
const MAX_TRACKED_JOBS = 40;

let readAt: Record<string, number> = {};
const listeners = new Set<() => void>();

const notify = () => listeners.forEach(listener => listener());

async function hydrate(): Promise<void> {
  const stored = await SecureStore.getItemAsync(STORAGE_KEY).catch(() => null);
  try {
    if (stored) readAt = JSON.parse(stored) ?? {};
  } catch {
    readAt = {};
  }
  notify();
}

export const hydrateChatRead = hydrate();

export function getChatReadAt(jobId: string): number {
  return readAt[jobId] ?? 0;
}

// Only ever moves forward, so a late snapshot cannot mark read messages unread.
export function markChatRead(jobId: string, at: number): void {
  if (!jobId || !Number.isFinite(at) || at <= getChatReadAt(jobId)) return;
  const newestFirst = Object.entries({ ...readAt, [jobId]: at }).sort(([, a], [, b]) => b - a);
  readAt = Object.fromEntries(newestFirst.slice(0, MAX_TRACKED_JOBS));
  SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(readAt)).catch(() => undefined);
  notify();
}

export function subscribeChatRead(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
