import { API_BASE_URL } from "./apiBase";
import { takeAbandoned } from "./breadcrumbs";

export type ClientReport = {
  kind: string;
  message: string;
  context?: string;
  stacktrace?: string;
};

const MAX_QUEUED = 20;
const queue: ClientReport[] = [];

export function report(entry: ClientReport): void {
  console.warn(`[${entry.kind}] ${entry.message}`, entry.context ?? "");
  if (queue.some(queued => queued.kind === entry.kind && queued.message === entry.message)) return;
  queue.push(entry);
  if (queue.length > MAX_QUEUED) queue.shift();
}

export function reportAbandonedWork(): void {
  for (const action of takeAbandoned()) {
    report({ kind: "abandoned_call", message: `Interrupted during ${action}` });
  }
}

export async function flushClientErrors(): Promise<void> {
  while (queue.length > 0) {
    const sent = await fetch(`${API_BASE_URL}/api/client-errors`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(queue[0]),
    }).catch(() => null);
    if (!sent?.ok) return;
    queue.shift();
  }
}

type GlobalHandler = (error: Error, isFatal?: boolean) => void;
type ErrorUtilsLike = { getGlobalHandler(): GlobalHandler; setGlobalHandler(handler: GlobalHandler): void };

export function installGlobalErrorHandler(): void {
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (!errorUtils) return;
  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    report({
      kind: isFatal ? "fatal_js_error" : "js_error",
      message: String(error?.message ?? error).slice(0, 300),
      stacktrace: error?.stack?.slice(0, 4000),
    });
    previous(error, isFatal);
  });
}
