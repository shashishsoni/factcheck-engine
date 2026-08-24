import { buildTranscriptResult, type TranscriptResult } from "./types";

const TRANSCRIPTION_PROMPT =
  "You are a professional transcriptionist. Watch and listen carefully. " +
  "Transcribe ALL spoken words exactly as said, in the original language. " +
  "Do not summarize, describe, or add commentary. Output only the raw transcript. " +
  "If there is no speech, output exactly NO_SPEECH_DETECTED.";

export async function tryGeminiFacebookTranscript(url: string): Promise<TranscriptResult | undefined> {
  const videoUrl = await extractFacebookVideoUrl(url);
  return videoUrl ? transcribeDownloadedVideo(videoUrl) : undefined;
}

export async function tryGeminiYouTubeTranscript(url: string): Promise<TranscriptResult | undefined> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return;

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: "gemini-3.5-flash" });
    const result = await model.generateContent([
      { text: TRANSCRIPTION_PROMPT },
      { fileData: { fileUri: url, mimeType: "video/mp4" } },
    ]);
    return toTranscriptResult(result.response.text());
  } catch {
    console.log("[transcript] Gemini YouTube transcription failed");
  }
}

async function extractFacebookVideoUrl(url: string): Promise<string | undefined> {
  try {
    const { getFbVideoInfo } = await import("fb-downloader-scrapper");
    const info = await getFbVideoInfo(url);
    const videoUrl = info.sd ?? info.hd;
    return videoUrl?.startsWith("http") ? videoUrl : undefined;
  } catch {
    console.log("[transcript] Facebook video URL lookup failed");
  }
}

async function transcribeDownloadedVideo(videoUrl: string): Promise<TranscriptResult | undefined> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return;

  try {
    const response = await fetch(videoUrl, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) return;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > 19_000_000) return transcribeViaFileApi(bytes, apiKey);

    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: "gemini-3.5-flash" });
    const result = await model.generateContent([
      { text: TRANSCRIPTION_PROMPT },
      { inlineData: { data: Buffer.from(bytes).toString("base64"), mimeType: "video/mp4" } },
    ]);
    return toTranscriptResult(result.response.text());
  } catch {
    console.log("[transcript] Gemini inline transcription failed");
  }
}

async function transcribeViaFileApi(
  bytes: Uint8Array,
  apiKey: string,
): Promise<TranscriptResult | undefined> {
  const base = "https://generativelanguage.googleapis.com/upload/v1beta/files";
  let fileName: string | undefined;
  try {
    const startResponse = await fetch(`${base}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(bytes.length),
        "X-Goog-Upload-Header-Content-Type": "video/mp4",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file: { displayName: "social-video.mp4" } }),
    });
    if (!startResponse.ok) return;
    const uploadUrl = startResponse.headers.get("x-goog-upload-url");
    if (!uploadUrl) return;

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Length": String(bytes.length),
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize",
      },
      body: Buffer.from(bytes),
    });
    if (!uploadResponse.ok) return;
    const uploaded = (await uploadResponse.json()) as {
      file: { name: string; uri: string; state: string };
    };
    fileName = uploaded.file.name;
    const file = await waitForActiveFile(uploaded.file, apiKey);
    if (!file) return;

    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: "gemini-3.5-flash" });
    const result = await model.generateContent([
      { text: TRANSCRIPTION_PROMPT },
      { fileData: { fileUri: file.uri, mimeType: "video/mp4" } },
    ]);
    return toTranscriptResult(result.response.text());
  } catch {
    console.log("[transcript] Gemini File API transcription failed");
  } finally {
    if (fileName) {
      await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`, {
        method: "DELETE",
      }).catch(() => {});
    }
  }
}

async function waitForActiveFile(
  file: { name: string; uri: string; state: string },
  apiKey: string,
): Promise<{ name: string; uri: string } | undefined> {
  let state = file.state;
  for (let attempt = 0; state === "PROCESSING" && attempt < 30; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${file.name}?key=${apiKey}`,
    );
    if (response.ok) {
      const current = (await response.json()) as { name: string; uri: string; state: string };
      state = current.state;
      if (state === "ACTIVE") return { name: current.name, uri: current.uri };
    }
  }
}

async function toTranscriptResult(text: string): Promise<TranscriptResult | undefined> {
  const normalized = text.trim();
  if (
    normalized.length < 20 ||
    normalized === "NO_SPEECH_DETECTED" ||
    /^(i cannot|i'm unable|sorry|i can't|cannot access)/i.test(normalized)
  ) return;
  return buildTranscriptResult(normalized, "gemini-ai-transcription", "auto");
}
