import type { InputAdapter } from "./types";

const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp|bmp|tiff?|heic|avif)$/i;
const IMAGE_URL_RE = /^https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|bmp|tiff?|heic|avif)$/i;

/**
 * Image adapter — accepts a URL or a local file path to an image.
 * EXIF/metadata extraction is best-effort; the AI vision provider does the
 * heavy semantic analysis later in the pipeline.
 */
export const imageAdapter: InputAdapter = {
  type: "image",
  canHandle(rawInput) {
    const v = rawInput.trim();
    return IMAGE_URL_RE.test(v) || IMAGE_EXT.test(v);
  },
  async extract(rawInput) {
    const url = rawInput.trim();
    const filename = url.split("/").pop()?.split("?")[0] ?? url;
    return {
      inputType: "image",
      rawInput: url,
      preview: `Image: ${filename}`,
      mediaUrls: [url],
      metadata: { filename },
      // No text content — the vision model will describe it and extract claims.
      textContent: undefined,
    };
  },
};
