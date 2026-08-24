import type { InputAdapter } from "./types";

const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|flac|aac|opus)$/i;
const AUDIO_URL_RE = /^https?:\/\/[^\s]+\.(mp3|wav|ogg|m4a|flac|aac|opus)$/i;

/**
 * Audio adapter — accepts a direct audio URL or a local file path.
 * Transcription is deferred to the AI layer (Gemini audio or Groq Whisper).
 */
export const audioAdapter: InputAdapter = {
  type: "audio",
  canHandle(rawInput) {
    const v = rawInput.trim();
    return AUDIO_URL_RE.test(v) || AUDIO_EXT.test(v);
  },
  async extract(rawInput) {
    const url = rawInput.trim();
    const filename = url.split("/").pop()?.split("?")[0] ?? url;
    return {
      inputType: "audio",
      rawInput: url,
      preview: `Audio: ${filename}`,
      mediaUrls: [url],
      metadata: { filename },
    };
  },
};
