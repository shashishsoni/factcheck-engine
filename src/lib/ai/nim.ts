import type { AiProvider, Capability } from "./types";
import type { AiTask } from "../types";
import { buildTextPrompt, callChat, streamChat } from "./shared/openai-compat";

/**
 * Generic NVIDIA NIM provider factory.
 * NVIDIA NIM hosts many models behind one OpenAI-compatible API:
 *   https://integrate.api.nvidia.com/v1/chat/completions
 *
 * All models use the same NIM_API_KEY — create one provider per model.
 */
export function createNimProvider(
  name: string,
  model: string,
  opts?: { temperature?: number; maxTokens?: number },
): AiProvider {
  const apiKey = process.env.NIM_API_KEY ?? "";
  const endpoint = "https://integrate.api.nvidia.com/v1/chat/completions";
  const temperature = opts?.temperature ?? 0.2;
  const maxTokens = opts?.maxTokens ?? 32_768;
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
