import * as SecureStore from "expo-secure-store";

const USER_KEY = "doyo_auth";
const TOKEN_KEY = "doyo_session_token";
const MAX_RESENDS = 2;
const RESEND_BLOCK_MS = 24 * 60 * 60 * 1000;
const EXPIRY_MARGIN_MS = 60_000;

export interface StoredUser {
  id: string;
  email: string;
  role: "customer" | "worker";
  mode?: "customer" | "worker";
  name?: string;
  phone?: string;
  googleUid?: string;
  onboardingStatus?: string;
  gender?: string;
  photoUri?: string;
  photoUrl?: string;
  rating?: number;
  bookings?: number;
}

export interface ResendState {
  count: number;
  blockedUntil?: number;
}

const listeners = new Set<() => void>();

function announceUserChange(): void {
  listeners.forEach(listener => {
    try {
      listener();
    } catch (error) {
      console.warn("user change listener failed", error);
    }
  });
}

export function onUserChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function saveUser(user: StoredUser): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  announceUserChange();
}

export async function getStoredUser(): Promise<StoredUser | null> {
  try {
    const stored = await SecureStore.getItemAsync(USER_KEY);
    return stored ? (JSON.parse(stored) as StoredUser) : null;
  } catch {
    return null;
  }
}

export async function clearUser(): Promise<void> {
  await Promise.all([SecureStore.deleteItemAsync(USER_KEY), SecureStore.deleteItemAsync(TOKEN_KEY)]);
  announceUserChange();
}

export function activeMode(user: StoredUser | null): "customer" | "worker" {
  return user?.mode ?? user?.role ?? "customer";
}

export async function setActiveMode(mode: "customer" | "worker"): Promise<StoredUser | null> {
  const user = await getStoredUser();
  if (!user) return null;
  const updated = { ...user, mode };
  await saveUser(updated);
  return updated;
}

function readClaims(token: string): { sub?: string; expires?: number } | null {
  try {
    const payload = token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "=")));
  } catch {
    return null;
  }
}

export function sessionTokenExpired(token: string, now = Date.now()): boolean {
  const expires = readClaims(token)?.expires;
  return typeof expires !== "number" || expires * 1000 <= now + EXPIRY_MARGIN_MS;
}

export const sessionTokenSubject = (token: string): string | null => readClaims(token)?.sub ?? null;

export async function saveSessionToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getStoredSessionToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function getSessionToken(): Promise<string | null> {
  const token = await getStoredSessionToken();
  return token && !sessionTokenExpired(token) ? token : null;
}

export async function clearSessionToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
  announceUserChange();
}

const resendKey = (email: string) => `doyo_otp_resend_${email.toLowerCase().replace(/[^a-z0-9._-]/g, "_")}`;

export async function getResendState(email: string): Promise<ResendState> {
  try {
    const stored = await SecureStore.getItemAsync(resendKey(email));
    return stored ? (JSON.parse(stored) as ResendState) : { count: 0 };
  } catch {
    return { count: 0 };
  }
}

export async function incrementResend(email: string): Promise<ResendState> {
  const count = (await getResendState(email)).count + 1;
  const state: ResendState = { count, blockedUntil: count >= MAX_RESENDS ? Date.now() + RESEND_BLOCK_MS : undefined };
  await SecureStore.setItemAsync(resendKey(email), JSON.stringify(state));
  return state;
}

export async function clearResendState(email: string): Promise<void> {
  await SecureStore.deleteItemAsync(resendKey(email));
}
