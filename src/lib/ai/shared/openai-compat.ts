import type { AiTask } from "../../types";
import { buildBatchEnsemblePrompt } from "../judge/prompts";
import { extractClaimsPrompt, evaluateClaimPrompt, synthesizePrompt } from "./prompts";
import { textValue } from "./text-utils";

/**
 * Shared helpers for OpenAI-compatible chat-completion endpoints (NIM, Groq,
 * OpenRouter, etc.). Both `call` and `callStream` speak the same request and
 * SSE shape, so providers only differ in endpoint, model, and tuning.
 */

export interface ChatOptions {
  apiKey: string;
  endpoint: string;
  model: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

/** Resolve an AiTask to its prompt string, or null for unsupported tasks. */
export function buildTextPrompt(task: AiTask): string | null {
  switch (task.kind) {
    case "extract-claims":
      return extractClaimsPrompt(task.content);
    case "evaluate-claim":
      return evaluateClaimPrompt(task.evidence);
    case "evaluate-claims":
      return buildBatchEnsemblePrompt(task.packet);
    case "synthesize-verdict":
      return synthesizePrompt(task.claims, task.sources, task.language);
    case "raw-text":
      return task.prompt;
    case "analyze-media":
      return null;
  }
}

export async function callChat({ apiKey, endpoint, model, prompt, systemPrompt, temperature = 0.2, maxTokens, timeoutMs = 300_000 }: ChatOptions): Promise<string> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(1000 * attempt * 2);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: buildMessages(prompt, systemPrompt),
          temperature,
          ...(maxTokens ? { max_tokens: maxTokens } : {}),
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        lastError = new Error(`${model} error ${res.status}: ${body.slice(0, 200)}`);
        if (res.status !== 429 && res.status < 500) break;
        continue;
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: unknown; reasoning_content?: unknown; reasoning?: unknown } }[];
      };
      const message = data.choices?.[0]?.message;
      const text = textValue(message?.content) || textValue(message?.reasoning_content) || textValue(message?.reasoning);
      if (text) return text;
      lastError = new Error(`${model}: empty response`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError ?? new Error(`${model}: all attempts failed`);
}

export async function streamChat({ apiKey, endpoint, model, prompt, systemPrompt, temperature = 0.2, maxTokens, timeoutMs = 300_000, onToken }: ChatOptions & { onToken: (chunk: string) => void }): Promise<string> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(1000 * attempt * 2); // 2s, 4s backoff
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: buildMessages(prompt, systemPrompt),
          temperature,
          stream: true,
          ...(maxTokens ? { max_tokens: maxTokens } : {}),
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok || !res.body) {
        const errorBody = await res.text().catch(() => "");
        lastError = new Error(`${model} stream error ${res.status}: ${errorBody.slice(0, 200)}`);
        // Retry on 429 (rate limit) or 5xx (server error, including 503 overload).
        if (res.status !== 429 && res.status < 500) break;
        continue;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      let reasoningText = "";

      const consumeLine = (line: string) => {
        const chunk = parseSseChunk(line);
        if (!chunk) return;
        if (chunk.reasoning) {
          reasoningText += chunk.reasoning;
          onToken(chunk.reasoning);
        }
        if (chunk.content) {
          fullText += chunk.content;
          onToken(chunk.content);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) consumeLine(line);
      }
      buffer += decoder.decode();
      if (buffer.trim()) consumeLine(buffer);

      const result = fullText || reasoningText;
      if (result) return result;
      lastError = new Error(`${model}: empty stream response`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError ?? new Error(`${model}: all stream attempts failed`);
}

function buildMessages(prompt: string, systemPrompt?: string): { role: "system" | "user"; content: string }[] {
  return [
    ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
    { role: "user", content: prompt },
  ];
}

function parseSseChunk(line: string): { content: string; reasoning: string } | null {
  const match = line.match(/^data:\s?(.*)$/);
  if (!match) return null;
  const data = match[1].trim();
  if (!data || data === "[DONE]") return null;
  try {
    const parsed = JSON.parse(data) as {
      choices?: { delta?: { content?: unknown; reasoning_content?: unknown; reasoning?: unknown } }[];
    };
    const delta = parsed.choices?.[0]?.delta;
    return {
      content: textValue(delta?.content),
      reasoning: textValue(delta?.reasoning_content) || textValue(delta?.reasoning),
    };
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
