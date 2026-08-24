import type { LanguageMode } from "../../types";
import { buildTranscriptResult, type TranscriptResult } from "./types";
import { extractYouTubeId } from "./platform";

export async function tryYouTubeTranscript(
  url: string,
  language: LanguageMode = "en",
): Promise<TranscriptResult | undefined> {
  const videoId = extractYouTubeId(url);
  if (!videoId) return;

  try {
    const { YouTubeTranscriptApi } = await import("youtube-transcript-api-js");
    const api = new YouTubeTranscriptApi();
    const preferredLanguages = language === "hi"
      ? ["hi", "en", "es", "fr", "de"]
      : ["en", "hi", "es", "fr", "de"];
    const transcript = await api.fetch(videoId, preferredLanguages) as {
      snippets: { text: string }[];
      languageCode?: string;
      language?: string;
      lang?: string;
    };
    const text = transcript.snippets
      .map((snippet) => snippet.text)
      .join(" ");
    return buildTranscriptResult(
      text,
      "youtube-transcript-api",
      transcript.languageCode ?? transcript.language ?? transcript.lang ?? "auto",
    );
  } catch {
    return;
  }
}
