import type { AiProvider, Capability } from "./types";
import type { AiTask } from "../types";
import { buildTextPrompt, callChat, streamChat } from "./shared/openai-compat";

/**
 * FreeLLMAPI provider — self-hosted OpenAI-compatible router that aggregates
 * 34 free-tier providers (NIM, Groq, OpenRouter, Gemini, Cohere, Mistral, etc.)
 * behind one endpoint. Automatic failover when a provider rate-limits, plus
 * per-key usage tracking to stay under each free-tier cap.
 *
 * Used here as a PER-ROLE FALLBACK: one pinned model per role (judge, ensemble,
 * extractor). The router still fails over across providers that host the same
 * model, but the model identity stays fixed — so your judge is always
 * Nemotron Ultra, your extractor is always Nemotron Super, etc.
 *
 * Setup:
 *   1. Run FreeLLMAPI locally (Docker: `docker run -p 3001:3001 ghcr.io/tashfeenahmed/freellmapi`
 *      or the desktop app from https://github.com/tashfeenahmed/freellmapi/releases)
 *   2. Add your provider keys (NIM, Groq, OpenRouter, Gemini, ...) in the
 *      dashboard at http://localhost:3001
 *   3. Export the unified API key from the dashboard as FREELLMAPI_KEY
 *
 * The router is free + open source. The $19/yr "premium" tier only speeds up
 * catalog updates (same-day vs 30-day lag); the router works without it.
 *
 * Browse the model catalog: https://freellmapi.co/models
 */
export function createFreeLlmApiProvider(
  name: string,
  model: string,
  opts?: { temperature?: number; maxTokens?: number },
): AiProvider {
  const apiKey = process.env.FREELLMAPI_KEY ?? "";
  const baseUrl = process.env.FREELLMAPI_BASE_URL ?? "http://localhost:3001";
  const endpoint = `${baseUrl}/v1/chat/completions`;
  const temperature = opts?.temperature ?? 0.2;
  const maxTokens = opts?.maxTokens ?? 4096;
  const systemPrompt = model.includes("nemotron") ? "detailed thinking on" : undefined;

  return {
    name,
    capabilities: ["text"] as Capability[],
    isAvailable: () => Boolean(apiKey),
    async run(task: AiTask): Promise<string> {
      const prompt = requirePrompt(name, apiKey, task);
      return callChat({ apiKey, endpoint, model, prompt, systemPrompt, temperature, maxTokens });
    },
    async runStream(task: AiTask, onToken: (chunk: string) => void): Promise<string> {
      const prompt = requirePrompt(name, apiKey, task);
      return streamChat({ apiKey, endpoint, model, prompt, systemPrompt, temperature, maxTokens, onToken });
    },
  };
}

function requirePrompt(name: string, apiKey: string, task: AiTask): string {
  if (!apiKey) throw new Error(`${name} not configured`);
  const prompt = buildTextPrompt(task);
  if (!prompt) throw new Error(`${name}: unsupported task`);
  return prompt;
}
