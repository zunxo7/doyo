import * as SecureStore from "expo-secure-store";

const STORAGE_KEY = "doyo_sheet_state";

export type SheetKey = "worker-active-job" | "customer-booking" | "customer-tracking" | "worker-tracking";

let expanded: Partial<Record<SheetKey, boolean>> = {};

async function hydrate(): Promise<void> {
  const stored = await SecureStore.getItemAsync(STORAGE_KEY).catch(() => null);
  if (!stored) return;
  try {
    expanded = JSON.parse(stored) ?? {};
  } catch {
    expanded = {};
  }
}

export const hydrateSheetState = hydrate();

export function getSheetExpanded(key: SheetKey, fallback = false): boolean {
  return expanded[key] ?? fallback;
}

export function setSheetExpanded(key: SheetKey, value: boolean): void {
  if (expanded[key] === value) return;
  expanded[key] = value;
  SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(expanded)).catch(() => undefined);
}
