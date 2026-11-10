import Anthropic from "@anthropic-ai/sdk";

const SIM_SPEED = Math.max(Number(process.env.SIM_SPEED) || 1, 0.1);
const WORKER_MODEL = "claude-haiku-5-5";
// Bounds what a public demo can spend; past it every decision falls back to rules.
const DAILY_CALL_CAP = 1000;

const hasKey = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
export const client = hasKey ? new Anthropic() : null;

let usage = { day: "", calls: 0 };

export function spendCall(): boolean {
  const day = new Date().toISOString().slice(0, 10);
  if (usage.day !== day) usage = { day, calls: 0 };
  if (++usage.calls === DAILY_CALL_CAP + 1) console.warn(`AI daily cap of ${DAILY_CALL_CAP} calls reached; rules take over until tomorrow`);
  return usage.calls <= DAILY_CALL_CAP;
}

export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms / SIM_SPEED));

export async function askJson<T>(system: string, prompt: string, schema: object, fallback: T): Promise<T> {
  if (!client || !spendCall()) return fallback;
  try {
    const message = await client.messages.create({
      model: WORKER_MODEL,
      max_tokens: 2000,
      output_config: { effort: "low", format: { type: "json_schema", schema: schema as Record<string, unknown> } },
      system,
      messages: [{ role: "user", content: prompt }],
    });
    if (message.stop_reason === "refusal" || message.stop_reason === "max_tokens") return fallback;
    const text = message.content.find(block => block.type === "text");
    return text?.type === "text" ? (JSON.parse(text.text) as T) : fallback;
  } catch (error) {
    console.warn("agent decision fell back to rules:", error instanceof Error ? error.message : error);
    return fallback;
  }
}
