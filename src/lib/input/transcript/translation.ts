export async function translateToEnglish(text: string): Promise<string | undefined> {
  const prompt = [
    "Translate the following transcript to English. This is spoken content from a video.",
    "Translate accurately, preserving meaning and tone. Output only the English translation.",
    "",
    text.slice(0, 8_000),
  ].join("\n");

  const translated = await tryGroqTranslation(prompt, text);
  if (translated) return translated;

  const geminiTranslation = await tryGeminiTranslation(prompt, text);
  if (geminiTranslation) return geminiTranslation;

  return tryNimTranslation(prompt, text);
}

async function tryGroqTranslation(prompt: string, original: string): Promise<string | undefined> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return;
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return;
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    return validTranslation(data.choices?.[0]?.message?.content, original);
  } catch {
    return;
  }
}

async function tryGeminiTranslation(prompt: string, original: string): Promise<string | undefined> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return;
  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: "gemini-3.5-flash" });
    const result = await model.generateContent(prompt);
    return validTranslation(result.response.text(), original);
  } catch {
    return;
  }
}

async function tryNimTranslation(prompt: string, original: string): Promise<string | undefined> {
  const apiKey = process.env.NIM_API_KEY;
  if (!apiKey) return;
  try {
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "meta/llama-3.1-70b-instruct",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 4_000,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return;
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    return validTranslation(data.choices?.[0]?.message?.content, original);
  } catch {
    return;
  }
}

function validTranslation(value: string | undefined, original: string): string | undefined {
  const translation = value?.trim();
  return translation && translation.length > 20 && translation !== original.slice(0, 8_000).trim()
    ? translation
    : undefined;
}
