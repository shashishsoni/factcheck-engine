import type { AiProvider, Capability } from "./types";
import type { AiTask } from "../types";
import { buildTextPrompt, callChat, streamChat } from "./shared/openai-compat";

export function createOpenRouterProvider(
  name: string,
  model: string,
  opts?: { temperature?: number; maxTokens?: number },
): AiProvider {
  const apiKey = process.env.OPENROUTER_API_KEY ?? "";
  const endpoint = "https://openrouter.ai/api/v1/chat/completions";
  const temperature = opts?.temperature ?? 0.2;
  const maxTokens = opts?.maxTokens ?? 4096;

  return {
    name,
    capabilities: ["text"] as Capability[],
    isAvailable: () => Boolean(apiKey),
    async run(task: AiTask): Promise<string> {
      const prompt = requirePrompt(name, apiKey, task);
      return callChat({ apiKey, endpoint, model, prompt, temperature, maxTokens });
    },
    async runStream(task: AiTask, onToken: (chunk: string) => void): Promise<string> {
      const prompt = requirePrompt(name, apiKey, task);
      return streamChat({ apiKey, endpoint, model, prompt, temperature, maxTokens, onToken });
    },
  };
}

function requirePrompt(name: string, apiKey: string, task: AiTask): string {
  if (!apiKey) throw new Error(`${name} not configured`);
  const prompt = buildTextPrompt(task);
  if (!prompt) throw new Error(`${name}: unsupported task`);
  return prompt;
}
