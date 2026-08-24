import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AiProvider, Capability } from "../types";
import type { AiTask } from "../../types";
import { runMedia } from "./media";
import { extractClaimsPrompt, synthesizePrompt } from "../shared/prompts";

export function createGeminiProvider(): AiProvider {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  const client = apiKey ? new GoogleGenerativeAI(apiKey) : null;

  return {
    name: "gemini",
    capabilities: ["text", "vision", "audio", "video", "search"] as Capability[],
    isAvailable: () => client !== null,
    async run(task: AiTask): Promise<string> {
      if (!client) throw new Error("Gemini not configured");
      switch (task.kind) {
        case "extract-claims":
          return runText(client, extractClaimsPrompt(task.content));
        case "analyze-media":
          return runMedia(client, task.mediaUrl, task.context);
        case "synthesize-verdict":
          return runText(client, synthesizePrompt(task.claims, task.sources, task.language));
        case "raw-text":
          return runText(client, task.prompt);
        default:
          throw new Error(`Gemini: unsupported task ${task.kind}`);
      }
    },
    async runStream(task: AiTask, onToken: (chunk: string) => void): Promise<string> {
      if (!client) throw new Error("Gemini not configured");
      switch (task.kind) {
        case "extract-claims":
          return runTextStream(client, extractClaimsPrompt(task.content), onToken);
        case "analyze-media":
          // Media analysis doesn't support streaming via SDK; emit result as single chunk.
          const mediaResult = await runMedia(client, task.mediaUrl, task.context);
          onToken(mediaResult);
          return mediaResult;
        case "synthesize-verdict":
          return runTextStream(client, synthesizePrompt(task.claims, task.sources, task.language), onToken);
        case "raw-text":
          return runTextStream(client, task.prompt, onToken);
        default:
          throw new Error(`Gemini: unsupported task ${task.kind}`);
      }
    },
  };
}

async function runText(client: GoogleGenerativeAI, prompt: string): Promise<string> {
  const model = client.getGenerativeModel({ model: "gemini-3.5-flash" });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * Streaming text generation — uses the SDK's generateContentStream to emit
 * tokens as they arrive, keeping the thinking showcase active throughout.
 */
async function runTextStream(
  client: GoogleGenerativeAI,
  prompt: string,
  onToken: (chunk: string) => void,
): Promise<string> {
  const model = client.getGenerativeModel({ model: "gemini-3.5-flash" });
  const stream = await model.generateContentStream(prompt);
  let fullText = "";
  for await (const chunk of stream.stream) {
    const text = chunk.text();
    if (text) {
      fullText += text;
      onToken(text);
    }
  }
  return fullText;
}
