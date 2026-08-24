import type { InputAdapter } from "./types";

const URL_RE = /^https?:\/\/[^\s]+$/i;

function isArticleUrl(url: string): boolean {
  return /article|news|blog|post|story|\/\d{4}\/|longform/i.test(url);
}

/**
 * Handles generic web URLs. Fetches the page, strips HTML to text.
 * Heavy lifting (JS-rendered pages) is delegated to the scraping layer;
 * this adapter just does the cheap first pass.
 */
export const urlAdapter: InputAdapter = {
  type: "url",
  canHandle(rawInput) {
    return URL_RE.test(rawInput.trim()) && !isSocialUrl(rawInput);
  },
  async extract(rawInput) {
    const url = rawInput.trim();
    const res = await fetch(url, {
      headers: { "user-agent": "FactCheckerBot/1.0 (+https://factchecker.app)" },
      signal: AbortSignal.timeout(15_000),
    });
    const html = await res.text();
    const { title, text } = stripHtml(html);
    return {
      inputType: "url",
      rawInput: url,
      preview: title ?? url,
      textContent: text.slice(0, 20_000),
      metadata: { finalUrl: res.url, contentType: res.headers.get("content-type") ?? "" },
    };
  },
};

/**
 * Article adapter — same mechanics as URL but flagged for news/blog URLs so the
 * engine can weight source reliability differently.
 */
export const articleAdapter: InputAdapter = {
  type: "article",
  canHandle(rawInput) {
    return URL_RE.test(rawInput.trim()) && isArticleUrl(rawInput.trim());
  },
  async extract(rawInput) {
    const content = await urlAdapter.extract(rawInput);
    return { ...content, inputType: "article" as const };
  },
};

function stripHtml(html: string): { title: string | null; text: string } {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : null;
  // Remove scripts/styles, then tags, then collapse whitespace.
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
  return { title, text: cleaned };
}

function isSocialUrl(url: string): boolean {
  return /(instagram|facebook|youtube|youtu\.be|twitter|x\.com|tiktok|reddit|linkedin)\./i.test(
    url,
  );
}
