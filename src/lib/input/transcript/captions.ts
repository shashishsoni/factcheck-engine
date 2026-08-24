import { buildTranscriptResult, type TranscriptResult } from "./types";
import { decodeEntities } from "../support/text-utils";

export async function tryCaptionTracks(
  url: string,
  platform: string,
): Promise<TranscriptResult | undefined> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(15_000),
      redirect: "follow",
    });
    if (!response.ok) return;
    const html = await response.text();

    const captionPatterns = [
      /"(https?:\/\/[^\"]+\.(?:vtt|srt|ttml)[^\"]*)"/gi,
      /"(https?:\/\/[^\"]*caption[^\"]*\.(?:vtt|srt|ttml)[^\"]*)"/gi,
      /"(https?:\/\/[^\"]*subtitle[^\"]*\.(?:vtt|srt|ttml)[^\"]*)"/gi,
      /"(https?:\/\/www\.youtube\.com\/api\/timedtext[^\"]+)"/gi,
      /"(https?:\/\/[^\"]*caption[^\"]*track[^\"]*)"/gi,
    ];

    for (const pattern of captionPatterns) {
      const match = html.match(pattern)?.[0];
      if (!match) continue;
      const captionUrl = match
        .replace(/^"|"$/g, "")
        .replace(/\\u0026/g, "&")
        .replace(/\\\//g, "/");
      const text = await fetchCaptionFile(captionUrl);
      if (text) {
        return buildTranscriptResult(
          text,
          "caption-track",
          getCaptionLanguage(captionUrl),
        );
      }
    }

    if (platform === "facebook") {
      const text = extractFacebookText(html);
      if (text) return buildTranscriptResult(text, "facebook-caption-text", "auto");
    }
  } catch {
    return;
  }
}

async function fetchCaptionFile(url: string): Promise<string | undefined> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) return;
    return parseCaptionFile(await response.text());
  } catch {
    return;
  }
}

function parseCaptionFile(raw: string): string {
  return decodeEntities(
    raw
      .replace(/^WEBVTT.*$/m, "")
      .replace(/^NOTE.*$/gm, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}/g, "")
      .replace(/\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}[.,]\d{3}/g, "")
      .replace(/^\d+$/gm, ""),
  )
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}

function getCaptionLanguage(url: string): string {
  try {
    const params = new URL(url).searchParams;
    return params.get("lang") ?? params.get("language") ?? params.get("hl") ?? "auto";
  } catch {
    return "auto";
  }
}

function extractFacebookText(html: string): string | undefined {
  const parts: string[] = [];
  const patterns = [
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    /"description":\s*"([^\"]{50,})"/,
    /"message":\s*"([^\"]{50,})"/,
    /data-content="([^\"]{50,})"/,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern)?.[1];
    if (match) parts.push(decodeEntities(match));
  }
  const text = parts.join("\n\n").trim();
  return text.length > 50 ? text.slice(0, 5_000) : undefined;
}

