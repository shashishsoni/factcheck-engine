import type { LanguageMode } from "@/lib/types";
import type { StreamEvent } from "./types";

export async function consumeFactCheckStream(
  input: string,
  language: LanguageMode,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch("/api/fact-check/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input, language }),
    signal,
  });
  if (!response.ok || !response.body) throw new Error("Failed to start verification stream");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const consume = (message: string) => {
    if (!message.startsWith("data: ")) return;
    try {
      onEvent(JSON.parse(message.slice(6)) as StreamEvent);
    } catch {
      // Ignore malformed events; the server may close during cancellation.
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const messages = buffer.split("\n\n");
    buffer = messages.pop() ?? "";
    for (const message of messages) consume(message);
  }

  buffer += decoder.decode();
  if (buffer.trim()) consume(buffer.trim());
}
