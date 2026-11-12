import { File, Paths } from "expo-file-system";
import type { AgentPlan } from "./bidding";

export type ChatItem =
  | { id: number; kind: "me" | "doyo" | "agent"; text: string }
  | { id: number; kind: "worker"; text: string; name?: string; avatar?: "male" | "female"; workerId?: string; price?: number; rating?: string; jobs?: string; minutesAway?: number; bookedBefore?: number; lastStars?: number | null }
  | { id: number; kind: "plan" };
export type ChatDraft = {
  items: ChatItem[];
  plan: AgentPlan | null;
  payment: "PayPal" | "Cash";
  request: { jobId: string; customerId: string } | null;
};

// An unbooked plan older than this quotes a stale address and stale prices.
const DRAFT_LIFETIME_MS = 24 * 60 * 60 * 1000;

const draftFile = () => new File(Paths.document, "doyo_chat_draft.json");

export function readChat(): ChatDraft | null {
  try {
    const file = draftFile();
    if (!file.exists) return null;
    const { at, ...draft } = JSON.parse(file.textSync()) as ChatDraft & { at: number };
    return draft.request || Date.now() - at <= DRAFT_LIFETIME_MS ? draft : null;
  } catch {
    return null;
  }
}

export function saveChat(draft: ChatDraft | null): void {
  try {
    const file = draftFile();
    if (draft) file.write(JSON.stringify({ ...draft, at: Date.now() }));
    else if (file.exists) file.delete();
  } catch (error) {
    console.warn("could not save chat", error);
  }
}
