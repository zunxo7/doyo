/**
 * The first step of every chat message. Pure small talk ("hi", "salam", "thanks", "ok") is answered
 * here at once, with no model call; anything with content goes on to the planner, which classifies
 * and plans in one call. A message counts as small talk only when every word is small talk, so
 * "hi, deep clean 3 rooms" still reaches the planner.
 */

type Kind = "greeting" | "thanks" | "ack" | "bye";

const WORDS: Record<Kind, string[]> = {
  greeting: ["hi", "hii", "hey", "hello", "helo", "yo", "salam", "salaam", "slm", "aoa", "assalam", "assalamu", "asalam", "o", "u", "alaikum", "alaykum", "alikum", "walaikum", "good", "morning", "evening", "afternoon", "there", "doyo", "السلام", "علیکم", "سلام"],
  thanks: ["thanks", "thank", "you", "thx", "ty", "shukriya", "shukria", "jazakallah", "jzk", "شکریہ"],
  ack: ["ok", "okay", "k", "kk", "cool", "nice", "great", "fine", "acha", "achha", "theek", "thik", "hai", "sure", "alright", "got", "it", "ٹھیک", "ہے", "اچھا"],
  bye: ["bye", "goodbye", "khuda", "allah", "hafiz", "see", "ya", "later", "خدا", "حافظ"],
};
const ORDER: Kind[] = ["bye", "thanks", "greeting", "ack"];

function smallTalk(text: string): Kind | null {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length || words.length > 5) return null;
  const all = new Set(Object.values(WORDS).flat());
  if (!words.every(word => all.has(word))) return null;
  return ORDER.find(kind => words.some(word => WORDS[kind].includes(word) && !["you", "o", "u", "it", "hai", "there", "good", "see", "ya", "allah", "doyo"].includes(word))) ?? null;
}

const urdu = (text: string) => /[؀-ۿ]/.test(text) || /\b(salam|salaam|slm|aoa|assalam|shukriya|shukria|acha|achha|theek|thik|hafiz|jazakallah)\b/i.test(text);

function reply(kind: Kind, text: string, hasPlan: boolean): string {
  const roman = urdu(text);
  switch (kind) {
    case "greeting":
      return roman ? "Wa alaikum assalam! Bataiye, kya karwana hai?" : "Hi! What can I get done for you today?";
    case "thanks":
      return roman ? "Koi baat nahi! Aur kuch?" : hasPlan ? "Anytime. Tap Book it when you're ready." : "Anytime! Anything else I can book?";
    case "ack":
      return hasPlan ? (roman ? "Theek hai. Tayyar hon to Book it dabaiye." : "Great. Tap Book it when you're ready, or tell me what to change.") : roman ? "Theek hai! Bataiye kya chahiye." : "Sure! Tell me what you need.";
    case "bye":
      return roman ? "Allah hafiz!" : "Bye for now!";
  }
}

/** A planner-shaped answer for small talk, or null when the planner should handle the message. */
export function quickReply(text: string, hasPlan: boolean): { understood: false; cancel: false; question: string; reply: string } | null {
  const kind = smallTalk(text);
  return kind ? { understood: false, cancel: false, question: reply(kind, text, hasPlan), reply: "" } : null;
}
