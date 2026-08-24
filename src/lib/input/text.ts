import type { InputAdapter } from "./types";

/**
 * Text adapter — catch-all fallback for raw claims typed directly by the user
 * (not a URL, ISBN, or media file). Must be registered LAST so every other,
 * more specific adapter gets first chance to match.
 */
export const textAdapter: InputAdapter = {
  type: "text",
  canHandle(rawInput) {
    return rawInput.trim().length > 0;
  },
  async extract(rawInput) {
    const text = rawInput.trim();
    return {
      inputType: "text",
      rawInput: text,
      preview: text.slice(0, 140),
      textContent: text,
    };
  },
};
