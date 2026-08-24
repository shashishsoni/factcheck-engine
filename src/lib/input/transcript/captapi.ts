import { buildTranscriptResult, type TranscriptResult } from "./types";

export async function tryCaptapiTranscript(url: string): Promise<TranscriptResult | undefined> {
  const apiKey = process.env.CAPTAPI_API_KEY;
  if (!apiKey) return;

  try {
    const response = await fetch(
      `https://api.captapi.com/v1/facebook/transcript?url=${encodeURIComponent(url)}&cache=true`,
      {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (!response.ok) return;

    const data = (await response.json()) as {
      data?: { transcript?: string; text?: string; language?: string };
    };
    const text = data.data?.transcript ?? data.data?.text;
    if (!text || text.length < 20) return;

    return buildTranscriptResult(
      text,
      "captapi-transcript",
      data.data?.language ?? "auto",
    );
  } catch {
    return;
  }
}
