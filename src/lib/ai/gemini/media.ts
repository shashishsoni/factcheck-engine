import { GoogleGenerativeAI } from "@google/generative-ai";

export async function runMedia(
  client: GoogleGenerativeAI,
  mediaUrl: string,
  context?: string,
): Promise<string> {
  const model = client.getGenerativeModel({ model: "gemini-3.5-flash" });
  const textPart = {
    text:
      "You are a fact-checker. Describe this media factually and list any verifiable claims it makes (statements presented as fact, statistics, quotes, dates, identities, locations). Be neutral and precise." +
      (context ? `\n\nContext: ${context}` : ""),
  };

  if (/youtube\.com|youtu\.be/i.test(mediaUrl)) {
    const prompt = [textPart, { fileData: { fileUri: mediaUrl, mimeType: "video/mp4" } }];
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  const videoResponse = await fetch(mediaUrl, { signal: AbortSignal.timeout(30_000) });
  if (!videoResponse.ok) throw new Error(`Failed to download video: HTTP ${videoResponse.status}`);
  const contentType = videoResponse.headers.get("content-type") ?? "";
  if (!contentType.startsWith("video/") && !contentType.startsWith("application/octet-stream")) {
    throw new Error(
      `Media URL returned ${contentType || "non-video content"} instead of a video file — ` +
      "the platform likely served a page or login wall instead of the media.",
    );
  }
  const videoBytes = new Uint8Array(await videoResponse.arrayBuffer());

  if (videoBytes.length > 19_000_000) {
    return analyzeLargeVideo(client, videoBytes, textPart);
  }

  const prompt = [
    textPart,
    {
      inlineData: {
        data: Buffer.from(videoBytes).toString("base64"),
        mimeType: "video/mp4",
      },
    },
  ];
  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function analyzeLargeVideo(
  client: GoogleGenerativeAI,
  videoBytes: Uint8Array,
  textPart: { text: string },
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  const base = "https://generativelanguage.googleapis.com/upload/v1beta/files";
  const startResponse = await fetch(`${base}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(videoBytes.length),
      "X-Goog-Upload-Header-Content-Type": "video/mp4",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { displayName: "media-analysis.mp4" } }),
  });
  if (!startResponse.ok) throw new Error(`File API start failed: HTTP ${startResponse.status}`);
  const uploadUrl = startResponse.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("File API: no upload URL returned");

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(videoBytes.length),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: Buffer.from(videoBytes),
  });
  if (!uploadResponse.ok) throw new Error(`File API upload failed: HTTP ${uploadResponse.status}`);
  const uploadData = (await uploadResponse.json()) as {
    file: { name: string; uri: string; state: string };
  };

  const file = await waitForFile(uploadData.file.name, uploadData.file.state, apiKey);
  try {
    const model = client.getGenerativeModel({ model: "gemini-3.5-flash" });
    const result = await model.generateContent([
      textPart,
      { fileData: { fileUri: file.uri, mimeType: "video/mp4" } },
    ]);
    return result.response.text();
  } finally {
    await fetch(`https://generativelanguage.googleapis.com/v1beta/${file.name}?key=${apiKey}`, {
      method: "DELETE",
    }).catch(() => {});
  }
}

async function waitForFile(
  name: string,
  initialState: string,
  apiKey: string,
): Promise<{ name: string; uri: string }> {
  let state = initialState;
  let attempts = 0;
  while (state === "PROCESSING" && attempts < 30) {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${name}?key=${apiKey}`,
    );
    if (response.ok) {
      const data = (await response.json()) as { state: string; uri: string; name: string };
      state = data.state;
      if (state === "ACTIVE") return { name: data.name, uri: data.uri };
    }
    attempts++;
  }
  throw new Error(`File API processing failed: state=${state}`);
}
