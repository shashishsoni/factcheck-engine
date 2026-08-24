import type { InputAdapter } from "./types";

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|avi|mkv)$/i;
const VIDEO_URL_RE = /^https?:\/\/[^\s]+\.(mp4|webm|mov|m4v|avi|mkv)$/i;

/**
 * Video adapter — accepts a direct video URL or a local file path.
 * For YouTube/social video URLs use the social adapter instead; this handles
 * raw video files. Transcription happens in the AI layer (Gemini multimodal).
 */
export const videoAdapter: InputAdapter = {
  type: "video",
  canHandle(rawInput) {
    const v = rawInput.trim();
    return VIDEO_URL_RE.test(v) || VIDEO_EXT.test(v);
  },
  async extract(rawInput) {
    const url = rawInput.trim();
    const filename = url.split("/").pop()?.split("?")[0] ?? url;
    return {
      inputType: "video",
      rawInput: url,
      preview: `Video: ${filename}`,
      mediaUrls: [url],
      metadata: { filename },
    };
  },
};
