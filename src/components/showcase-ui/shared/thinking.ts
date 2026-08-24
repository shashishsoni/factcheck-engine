import { useEffect, useRef } from "react";

export function useScrollToLatest<T extends HTMLElement>(content?: string | unknown) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [content]);

  return ref;
}

export function formatThinkingText(raw?: unknown): string {
  if (!raw) return "";
  const text = typeof raw === "string" ? raw : typeof raw === "object" ? JSON.stringify(raw) : String(raw);
  const clean = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  if (!clean) return "";

  const thinkBlock = clean.match(/<think>([\s\S]*?)(?:<\/think>|$)/i)?.[1]?.trim();
  if (thinkBlock) return thinkBlock;

  const finalJsonStart = clean.search(/[\[{]/);
  if (finalJsonStart > 0) return clean.slice(0, finalJsonStart).trim();

  try {
    const parsed = JSON.parse(clean) as {
      verdict?: string;
      confidence?: number;
      explanation?: string;
      reasoning?: string;
      argument?: string;
    } | { explanation?: string; reasoning?: string; argument?: string }[];
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => item.explanation ?? item.reasoning ?? item.argument ?? "")
        .filter(Boolean)
        .join("\n\n");
    }
    const body = parsed.explanation ?? parsed.reasoning ?? parsed.argument;
    if (body) return typeof body === "string" ? body : JSON.stringify(body);
    if (parsed.verdict || parsed.confidence != null) {
      return [
        parsed.verdict ? `Verdict: ${parsed.verdict}` : "",
        parsed.confidence != null ? `Confidence: ${parsed.confidence}%` : "",
      ].filter(Boolean).join("\n");
    }
  } catch {
    // The response is incomplete JSON while streaming; use the readable fallback.
  }

  const explanation = clean.match(/"(?:explanation|reasoning|argument)"\s*:\s*"((?:\\.|[^"\\])*)/i)?.[1];
  if (explanation) return decodeJsonText(explanation);

  const fields = [
    clean.match(/"verdict"\s*:\s*"([^"}]*)/i)?.[1],
    clean.match(/"confidence"\s*:\s*([\d.]*)/i)?.[1],
  ].filter(Boolean);
  if (fields.length > 0) {
    return fields.map((value, index) => index === 0 ? `Verdict: ${value}` : `Confidence: ${value}%`).join("\n");
  }

  return decodeJsonText(clean)
    .replace(/[{}[\]"]+/g, "")
    .replace(/\s*,\s*/g, "\n")
    .replace(/\s*:\s*/g, ": ")
    .trim();
}

function decodeJsonText(value: unknown): string {
  if (!value) return "";
  const str = typeof value === "string" ? value : String(value);
  return str
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}
