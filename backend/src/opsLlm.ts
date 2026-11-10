import type Anthropic from "@anthropic-ai/sdk";
import { client } from "./ai.ts";
import { HttpError } from "./auth.ts";

/**
 * Runs one model turn for the dashboard's assistant. The dashboard sends AG Studio's provider-neutral
 * request; this turns it into a Claude call and back, so the API key never reaches the browser.
 */

const MODEL = "claude-sonnet-5-5";
// The assistant has a budget of its own, so it can never starve the booking agent.
const DAILY_TURN_CAP = 250;
let usage = { day: "", turns: 0 };

type Item =
  | { type: "message"; role: "user" | "system" | "assistant"; content: { type: string; text?: string; refusal?: string }[] }
  | { type: "function_call"; callId: string; name: string; arguments: string }
  | { type: "function_call_output"; callId: string; output: string }
  | { type: "reasoning" };

export type TurnRequest = {
  input: Item[];
  instructions?: string;
  tools?: { name: string; description: string; parameters: Record<string, unknown>; kind?: string }[];
  toolChoice?: "auto" | "none" | "required" | { name: string };
  responseFormat?: { type: "text" } | { type: "json"; name: string; schema: Record<string, unknown> };
};

function toMessages(input: Item[]): { system: string[]; messages: Anthropic.MessageParam[] } {
  const system: string[] = [];
  const messages: Anthropic.MessageParam[] = [];
  const push = (role: "user" | "assistant", block: Anthropic.ContentBlockParam) => {
    const last = messages.at(-1);
    // Claude wants strictly alternating roles, so neighbouring items of one role share a message.
    if (last?.role === role) (last.content as Anthropic.ContentBlockParam[]).push(block);
    else messages.push({ role, content: [block] });
  };
  for (const item of input) {
    if (item.type === "message") {
      const text = item.content.map(part => part.text ?? part.refusal ?? "").join("\n").trim();
      if (!text) continue;
      if (item.role === "system") system.push(text);
      else push(item.role, { type: "text", text });
    } else if (item.type === "function_call") {
      let args: unknown = {};
      try {
        args = JSON.parse(item.arguments || "{}");
      } catch {
        args = {};
      }
      push("assistant", { type: "tool_use", id: item.callId, name: item.name, input: args });
    } else if (item.type === "function_call_output") {
      push("user", { type: "tool_result", tool_use_id: item.callId, content: item.output || "(empty)" });
    }
  }
  if (messages[0]?.role !== "user") messages.unshift({ role: "user", content: [{ type: "text", text: "Continue." }] });
  return { system, messages };
}

export async function runTurn(request: TurnRequest) {
  if (!client) throw new HttpError(503, "The assistant is not set up.");
  const day = new Date().toISOString().slice(0, 10);
  if (usage.day !== day) usage = { day, turns: 0 };
  if (++usage.turns > DAILY_TURN_CAP) throw new HttpError(429, "The assistant has reached today's limit. Try again tomorrow.");

  const { system, messages } = toMessages(request.input);
  const format = request.responseFormat;
  const instructions = [
    request.instructions ?? "",
    ...system,
    format?.type === "json" ? `Reply with only a JSON object that matches this schema, and nothing else:\n${JSON.stringify(format.schema)}` : "",
  ].filter(Boolean);
  const tools = request.toolChoice === "none" ? [] : (request.tools ?? []).filter(tool => tool.kind !== "provided");
  const choice = request.toolChoice;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: instructions.join("\n\n") || undefined,
    messages,
    tools: tools.length ? tools.map(tool => ({ name: tool.name, description: tool.description, input_schema: tool.parameters as Anthropic.Tool.InputSchema })) : undefined,
    tool_choice: !tools.length || !choice || choice === "auto" || choice === "none" ? undefined : choice === "required" ? { type: "any" } : { type: "tool", name: choice.name },
  });

  const output = message.content.flatMap((block, index): Record<string, unknown>[] => {
    if (block.type === "text" && block.text.trim()) {
      return [{ id: `${message.id}_${index}`, kind: "output", type: "message", role: "assistant", status: "completed", content: [{ type: "text", text: block.text, annotations: [] }] }];
    }
    if (block.type === "tool_use") {
      return [{ id: block.id, kind: "output", type: "function_call", callId: block.id, name: block.name, arguments: JSON.stringify(block.input ?? {}), status: "completed" }];
    }
    return [];
  });

  return {
    id: message.id,
    createdAt: Date.now(),
    status: message.stop_reason === "max_tokens" ? "incomplete" : "completed",
    incompleteDetails: message.stop_reason === "max_tokens" ? { reason: "max_output_tokens" } : undefined,
    output,
    model: MODEL,
    usage: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens },
  };
}
