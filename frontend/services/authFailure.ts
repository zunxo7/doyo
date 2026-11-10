import { clearSessionToken } from "./auth";
import { report } from "./clientErrors";

// One dead credential makes every in-flight request fail, so a burst counts once.
const BURST_WINDOW_MS = 30_000;

let handledAt = 0;

export async function handleUnauthorized(path = "unknown"): Promise<void> {
  if (Date.now() - handledAt < BURST_WINDOW_MS) return;
  handledAt = Date.now();
  report({ kind: "session_rejected", message: "Session rejected by the server", context: path });
  await clearSessionToken();
}
