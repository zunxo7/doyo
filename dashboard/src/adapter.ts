import type { AgAiEvent, AgLlmAdapter, AgLlmResponse } from "ag-studio";
import { call } from "./api";

/**
 * AG Studio's assistant, answered by Claude. Each turn goes to Doyo's backend, which holds the key and
 * calls Claude; the reply comes back whole and is replayed here as the events Studio expects.
 */
export const claudeAdapter: AgLlmAdapter = {
  executeTurn(request, options) {
    const complete: Promise<AgLlmResponse> = call<AgLlmResponse>(
      "/api/ops/llm",
      { input: request.input, instructions: request.instructions, tools: request.tools, toolChoice: request.toolChoice, responseFormat: request.responseFormat },
      options?.signal,
    ).catch(
      (error: unknown): AgLlmResponse => ({
        id: `failed_${Date.now()}`,
        createdAt: Date.now(),
        status: "failed",
        error: { code: "doyo_backend", message: error instanceof Error ? error.message : "The assistant could not answer." },
        output: [],
      }),
    );

    async function* events(): AsyncGenerator<AgAiEvent> {
      const response = await complete;
      for (const item of response.output) {
        if (item.type === "message") {
          yield { type: "TEXT_MESSAGE_START", messageId: item.id, role: "assistant" };
          for (const part of item.content) {
            if (part.type === "text") yield { type: "TEXT_MESSAGE_CONTENT", messageId: item.id, delta: part.text };
          }
          yield { type: "TEXT_MESSAGE_END", messageId: item.id };
        } else if (item.type === "function_call") {
          yield { type: "TOOL_CALL_START", toolCallId: item.callId, toolCallName: item.name };
          yield { type: "TOOL_CALL_ARGS", toolCallId: item.callId, delta: item.arguments };
          yield { type: "TOOL_CALL_END", toolCallId: item.callId };
        }
      }
    }

    return { stream: { [Symbol.asyncIterator]: () => events() }, complete };
  },
};
