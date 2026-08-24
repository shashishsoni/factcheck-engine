import type { AiProvider, Capability } from "./types";
import type { AiTask } from "../types";
import { buildTextPrompt, callChat, streamChat } from "./shared/openai-compat";

/**
 * Groq provider — free tier, very fast text inference.
 * Uses GPT-OSS 120B (OpenAI open-weight, 120B params, production status).
 * Text-only fallback — NIM is primary for text tasks.
 */
export function createGroqProvider(): AiProvider {
  const apiKey = process.env.GROQ_API_KEY ?? "";
  const endpoint = "https://api.groq.com/openai/v1/chat/completions";
  const model = "openai/gpt-oss-120b";

  return {
    name: "groq",
    capabilities: ["text"] as Capability[],
    isAvailable: () => Boolean(apiKey),
    async run(task: AiTask): Promise<string> {
      const prompt = requirePrompt(apiKey, task);
      return callChat({ apiKey, endpoint, model, prompt, temperature: 0.2, timeoutMs: 30_000 });
    },
    async runStream(task: AiTask, onToken: (chunk: string) => void): Promise<string> {
      const prompt = requirePrompt(apiKey, task);
      return streamChat({ apiKey, endpoint, model, prompt, temperature: 0.2, timeoutMs: 120_000, onToken });
    },
  };
}

function requirePrompt(apiKey: string, task: AiTask): string {
  if (!apiKey) throw new Error("Groq not configured");
  const prompt = buildTextPrompt(task);
  if (!prompt) throw new Error("Groq: unsupported task");
  return prompt;
}
