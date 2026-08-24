export async function runSearchGroundedEvaluation(
  apiKey: string,
  prompt: string,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.2 },
  });

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(1000 * attempt * 2); // 2s, 4s backoff
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(120_000),
    });

    if (response.ok) {
      const data = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
        promptFeedback?: { blockReason?: string };
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        const blockReason = data.promptFeedback?.blockReason;
        throw new Error(
          blockReason
            ? `Gemini search-grounded blocked: ${blockReason}`
            : "Gemini search-grounded: no text in response",
        );
      }
      return text;
    }

    const errorBody = await response.text().catch(() => "");
    lastError = new Error(`Gemini search-grounded HTTP ${response.status}: ${errorBody.slice(0, 200)}`);
    if (response.status === 429 && /quota/i.test(errorBody)) break;
    if (response.status !== 429 && response.status < 500) break;
  }
  throw lastError ?? new Error("Gemini search-grounded: all attempts failed");
}

/**
 * Streaming version of runSearchGroundedEvaluation — uses the REST API's
 * streamGenerateContent endpoint with alt=sse to emit tokens as they arrive.
 * This keeps the thinking showcase box active throughout Gemini's deliberation.
 */
export async function runSearchGroundedEvaluationStream(
  apiKey: string,
  prompt: string,
  onToken: (chunk: string) => void,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`;
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.2 },
  });

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(1000 * attempt * 2); // 2s, 4s backoff
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(180_000),
    });

    if (!response.ok || !response.body) {
      const errorBody = await response.text().catch(() => "");
      lastError = new Error(`Gemini stream HTTP ${response.status}: ${errorBody.slice(0, 200)}`);
      if (response.status === 429 && /quota/i.test(errorBody)) break;
      if (response.status !== 429 && response.status < 500) break;
      continue;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;
        try {
          const chunk = JSON.parse(jsonStr) as {
            candidates?: { content?: { parts?: { text?: string }[] } }[];
            promptFeedback?: { blockReason?: string };
          };
          const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            fullText += text;
            onToken(text);
          }
        } catch {
          // ignore incomplete JSON lines
        }
      }
    }

    if (fullText) return fullText;
    lastError = new Error("Gemini stream: no text received");
    // If we got text but it was empty, don't retry — just fail.
    break;
  }
  throw lastError ?? new Error("Gemini stream: all attempts failed");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
