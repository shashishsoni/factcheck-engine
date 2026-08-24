import { buildTranscriptResult, type TranscriptResult } from "./types";

type TranscriptChunk = { text: string; offset?: number; duration?: number; lang?: string };
type SupadataResponse = {
  content?: string | TranscriptChunk[];
  lang?: string;
  jobId?: string;
  status?: string;
  error?: string;
};

export async function trySupadataTranscript(
  url: string,
  platform: string,
): Promise<TranscriptResult | undefined> {
  const apiKey = process.env.SUPADATA_API_KEY;
  if (!apiKey) return;

  const params = new URLSearchParams({ url, text: "true", mode: "auto" });
  // Retry transient failures (rate limits, 5xx, timeouts) once — a single
  // blip must not silently drop the best extraction strategy.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(`https://api.supadata.ai/v1/transcript?${params}`, {
        headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(60_000),
      });
      if (response.status === 402) return;
      if (response.status === 429 || response.status >= 500) {
        if (attempt === 0) {
          console.log(`[transcript] Supadata transient HTTP ${response.status} — retrying`);
          await new Promise((resolve) => setTimeout(resolve, 2_000));
          continue;
        }
        return;
      }
      if (!response.ok) return;

      const data = (await response.json()) as SupadataResponse;
      if (data.jobId && !data.content) {
        return pollSupadataJob(data.jobId, apiKey);
      }
      if (!data.content) return;
      return finalizeTranscript(data.content, data.lang, `Supadata ${platform}`);
    } catch {
      console.log("[transcript] Supadata request failed");
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
  }
}

async function pollSupadataJob(
  jobId: string,
  apiKey: string,
): Promise<TranscriptResult | undefined> {
  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    try {
      const response = await fetch(`https://api.supadata.ai/v1/transcript/${jobId}`, {
        headers: { "x-api-key": apiKey },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) continue;

      const data = (await response.json()) as SupadataResponse;
      if (data.status === "failed" || data.error) return;
      if (data.status === "completed" && data.content) {
        return finalizeTranscript(data.content, data.lang, "Supadata job");
      }
    } catch {
      console.log("[transcript] Supadata polling failed");
    }
  }
  return;
}

async function finalizeTranscript(
  content: string | TranscriptChunk[],
  language: string | undefined,
  label: string,
): Promise<TranscriptResult | undefined> {
  const originalText = normalizeContent(content);
  const chunkLanguage = Array.isArray(content)
    ? content.find((chunk) => chunk.lang)?.lang
    : undefined;
  const sourceLanguage = language?.trim() || chunkLanguage || "auto";
  const result = await buildTranscriptResult(
    originalText,
    "supadata-transcript",
    sourceLanguage,
  );
  if (!result) return;

  console.log(`[transcript] ${label} success: ${originalText.length} chars`);
  return result;
}

function normalizeContent(content: string | TranscriptChunk[]): string {
  const text = typeof content === "string"
    ? content
    : content.map((chunk) => chunk.text).join(" ");
  return text.replace(/\s+/g, " ").trim();
}
