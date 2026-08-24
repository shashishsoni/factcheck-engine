import type { LanguageMode } from "../types";
import type { InputAdapter } from "./types";
import { extractTranscript } from "./transcript";
import { detectPlatform as detectTranscriptPlatform } from "./transcript/platform";
import { stripHtml } from "./support/text-utils";

const SOCIAL_RE =
  /(instagram\.com|facebook\.com|youtube\.com|youtu\.be|twitter\.com|x\.com|tiktok\.com|reddit\.com|linkedin\.com|vimeo\.com)/i;

const OEMBED_ENDPOINTS: { match: RegExp; endpoint: string }[] = [
  { match: /youtube\.com|youtu\.be/i, endpoint: "https://www.youtube.com/oembed?format=json&url=" },
  { match: /twitter\.com|x\.com/i, endpoint: "https://publish.twitter.com/oembed?url=" },
  { match: /reddit\.com/i, endpoint: "https://www.reddit.com/oembed?url=" },
  { match: /tiktok\.com/i, endpoint: "https://www.tiktok.com/oembed?url=" },
];

/**
 * Social adapter — handles posts from major platforms.
 *
 * Strategy (tries each in order until it gets ACTUAL post content):
 *   0. Transcript extraction — for video/audio URLs, extract spoken content
 *      through dedicated transcript services or caption tracks
 *   1. oEmbed API (free, no auth) — title/author/caption
 *   2. Native fetch + meta tags — last resort, gets og:title/og:description
 *
 * We do not use generic web search as a substitute for the actual post content.
 *
 * If all extraction fails, we return empty content so the engine can tell
 * the user to paste the post text manually.
 */
export const socialAdapter: InputAdapter = {
  type: "social",
  canHandle(rawInput) {
    return SOCIAL_RE.test(rawInput.trim());
  },
  async extract(rawInput, language: LanguageMode = "en") {
    const url = rawInput.trim();
    const platform = displayPlatform(url);
    let preview = `${platform} post: ${url}`;
    let textContent: string | undefined;
    let originalTextContent: string | undefined;
    const metadata: Record<string, string> = { url, platform };

    // 0. Prefer the actual spoken transcript over page metadata.
    // This is the BEST source — actual spoken content from the video/reel
    const extractionAttempts: string[] = [];
    try {
      const transcript = await extractTranscript(url, extractionAttempts);
      if (transcript && transcript.text.length > 50) {
        textContent = transcript.text;
        originalTextContent = transcript.originalText ?? transcript.text;
        metadata.transcriptMethod = transcript.method;
        if (transcript.language) metadata.transcriptLanguage = transcript.language;
        const transcriptPreview = language === "hi"
          ? transcript.originalText ?? transcript.text
          : transcript.text;
        preview = `${platform} Video: ${transcriptPreview.slice(0, 160)}`;
      }
    } catch {
      // Transcript extraction is best-effort — continue to other strategies
    }

    // 1. Try oEmbed (skip if we already have a good transcript)
    const endpoint = OEMBED_ENDPOINTS.find((e) => e.match.test(url))?.endpoint;
    if (endpoint) {
      try {
        const res = await fetch(`${endpoint}${encodeURIComponent(url)}`, {
          signal: AbortSignal.timeout(10_000),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            title?: string;
            author_name?: string;
            provider_name?: string;
            html?: string;
          };
          metadata.author = data.author_name ?? "";
          metadata.provider = data.provider_name ?? "";
          // Only use oEmbed text if we don't already have a transcript
          if (data.title && !textContent) {
            preview = `${data.provider_name ?? platform}: ${data.title}`;
            textContent = stripHtml(data.html ?? data.title);
          } else if (data.title) {
            // We have a transcript — just use oEmbed for preview enrichment
            metadata.oembedTitle = data.title;
          }
        } else if (!textContent) {
          extractionAttempts.push(`oEmbed: HTTP ${res.status}`);
        }
      } catch {
        if (!textContent) extractionAttempts.push("oEmbed: request failed");
      }
    }

    // 2. If oEmbed did not provide text, try native page metadata.
    if (!textContent) {
      textContent = await tryNativeFetch(url);
      if (textContent) {
        preview = `${platform} post (scraped): ${textContent.slice(0, 80)}`;
        metadata.extractionMethod = "native-fetch";
      } else {
        extractionAttempts.push("Native page fetch: platform blocked automated access");
      }
    }

    if (!textContent && extractionAttempts.length > 0) {
      metadata.extractionAttempts = extractionAttempts.join(" | ");
    }

    return {
      inputType: "social",
      rawInput: url,
      preview,
      textContent,
      originalTextContent: originalTextContent ?? textContent,
      // For video posts, expose the URL as a mediaUrl so the engine can run
      // Gemini media analysis (vision/audio/video) as a fallback when we
      // couldn't extract a transcript. Gemini can watch/listen to the video
      // and describe what's said even when caption scraping fails.
      mediaUrls: isVideoPost(url, platform) ? [url] : undefined,
      metadata,
    };
  },
};

/** Detect whether a social URL is a video/reel (vs a text/photo post). */
function isVideoPost(url: string, platform: string): boolean {
  const lower = url.toLowerCase();
  if (platform === "YouTube") return true;
  if (platform === "Facebook") return /\/(videos|reels|watch|share\/v)\//i.test(lower) || /fb\.watch/i.test(lower);
  if (platform === "Instagram") return /\/(reels|reel|tv)\//i.test(lower);
  if (platform === "TikTok") return /\/video\//i.test(lower);
  if (platform === "X/Twitter") return /\/status\//i.test(lower);
  if (platform === "Reddit") return /\/(video|r\/\w+\/comments)\//i.test(lower);
  if (platform === "Vimeo") return true;
  return false;
}

// --- Fallback extraction strategies ---

async function tryNativeFetch(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; FactChecker/1.0; +https://factchecker.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10_000),
      redirect: "follow",
    });
    if (!res.ok) return;
    const html = await res.text();
    const text = stripHtml(extractMetaTags(html));
    if (text.length > 20) return text.slice(0, 3000);
  } catch {
    // Best-effort
  }
}

// --- Helpers ---

function displayPlatform(url: string): string {
  const labels: Record<string, string> = {
    youtube: "YouTube",
    facebook: "Facebook",
    instagram: "Instagram",
    tiktok: "TikTok",
    twitter: "X/Twitter",
    reddit: "Reddit",
    linkedin: "LinkedIn",
    vimeo: "Vimeo",
  };
  return labels[detectTranscriptPlatform(url)] ?? "Social";
}

/** Extract og:title, og:description, twitter:title, twitter:description meta tags. */
function extractMetaTags(html: string): string {
  const parts: string[] = [];

  // og:title
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (ogTitle?.[1]) parts.push(stripHtml(ogTitle[1]));

  // og:description
  const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  if (ogDesc?.[1]) parts.push(stripHtml(ogDesc[1]));

  // twitter:title
  const twTitle = html.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i);
  if (twTitle?.[1]) parts.push(stripHtml(twTitle[1]));

  // twitter:description
  const twDesc = html.match(/<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/i);
  if (twDesc?.[1]) parts.push(stripHtml(twDesc[1]));

  // <title> tag
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (title?.[1]) parts.push(stripHtml(title[1]));

  // meta description
  const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  if (metaDesc?.[1]) parts.push(stripHtml(metaDesc[1]));

  return parts.join("\n\n");
}
