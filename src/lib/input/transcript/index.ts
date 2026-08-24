import { tryCaptapiTranscript } from "./captapi";
import { tryCaptionTracks } from "./captions";
import {
  tryGeminiFacebookTranscript,
  tryGeminiYouTubeTranscript,
} from "./gemini";
import { detectPlatform } from "./platform";
import { trySupadataTranscript } from "./supadata";
import { tryYouTubeTranscript } from "./youtube";
import type { TranscriptResult } from "./types";

export type { TranscriptResult } from "./types";
export { detectPlatform } from "./platform";

export async function extractTranscript(
  url: string,
  attempts?: string[],
): Promise<TranscriptResult | undefined> {
  const platform = detectPlatform(url);
  console.log(`[transcript] extractTranscript called for ${platform}: ${url.slice(0, 80)}`);
  const note = (msg: string) => {
    attempts?.push(msg);
    console.log(`[transcript] ${msg}`);
  };

  const supadataKey = Boolean(process.env.SUPADATA_API_KEY);
  const supadata = await trySupadataTranscript(url, platform);
  if (supadata) return supadata;
  note(supadataKey ? "Supadata: no transcript returned" : "Supadata: skipped (SUPADATA_API_KEY not set)");

  if (platform === "facebook") {
    const gemini = await tryGeminiFacebookTranscript(url);
    if (gemini) return gemini;
    note(
      process.env.GEMINI_API_KEY
        ? "Gemini Facebook transcription: failed (could not obtain downloadable video)"
        : "Gemini Facebook transcription: skipped (GEMINI_API_KEY not set)",
    );
  }

  if (platform === "youtube") {
    const gemini = await tryGeminiYouTubeTranscript(url);
    if (gemini) return gemini;
    note(
      process.env.GEMINI_API_KEY
        ? "Gemini YouTube transcription: failed"
        : "Gemini YouTube transcription: skipped (GEMINI_API_KEY not set)",
    );
  }

  if (["facebook", "instagram", "tiktok"].includes(platform)) {
    const captapi = await tryCaptapiTranscript(url);
    if (captapi) return captapi;
    note(
      process.env.CAPTAPI_API_KEY
        ? "CaptAPI: no transcript returned"
        : "CaptAPI: skipped (CAPTAPI_API_KEY not set)",
    );
  }

  if (platform === "youtube") {
    const youtube = await tryYouTubeTranscript(url);
    if (youtube) return youtube;
    note("YouTube caption API: no captions available");
  }

  const captions = await tryCaptionTracks(url, platform);
  if (captions) return captions;
  note("Caption-track scrape: platform page blocked or has no caption tracks");

  console.log(`[transcript] All transcript strategies failed for ${platform}`);
}
