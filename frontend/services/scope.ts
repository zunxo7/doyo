import { useEffect, useState } from "react";
import { File, Paths } from "expo-file-system";
import { requestJson } from "./bidding";

export type ScopeService = "home" | "vehicle" | "furniture" | "barber";
export type ScopeItem = { area: string; method: string; excluded?: boolean };
export type ScopePage = { label: string; items: ScopeItem[] };
export type ServiceScope = Record<ScopeService, [ScopePage, ScopePage]>;

/** The server holds the only copy of the scope, the same one Doyo answers from. The last copy is kept for offline use. */
const cacheFile = () => new File(Paths.document, "doyo_scope.json");
let current: ServiceScope | null = null;
const listeners = new Set<(scope: ServiceScope) => void>();

function readCache(): ServiceScope | null {
  try {
    const file = cacheFile();
    return file.exists ? (JSON.parse(file.textSync()) as ServiceScope) : null;
  } catch {
    return null;
  }
}

/** Fetches the scope; called at launch so the Scope guide is ready before anyone opens it. */
export async function loadScope(): Promise<void> {
  current ??= readCache();
  try {
    const scope = await requestJson<ServiceScope>("/api/scope");
    current = scope;
    listeners.forEach(listener => listener(scope));
    cacheFile().write(JSON.stringify(scope));
  } catch {
    // Offline: the cached copy stays in use.
  }
}

export function useServiceScope(): ServiceScope | null {
  const [scope, setScope] = useState<ServiceScope | null>(() => (current ??= readCache()));
  useEffect(() => {
    listeners.add(setScope);
    if (!current) void loadScope();
    return () => {
      listeners.delete(setScope);
    };
  }, []);
  return scope;
}
