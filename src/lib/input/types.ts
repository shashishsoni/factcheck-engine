import type { ExtractedContent, InputType, LanguageMode } from "../types";

/**
 * InputAdapter — every input type (URL, image, video, audio, article, book, social)
 * implements this interface. The verification engine never knows which concrete
 * adapter it's using; it only works with ExtractedContent.
 *
 * This is the seam that keeps the system decoupled: add a new input type by
 * adding a new adapter, no engine changes required.
 */
export interface InputAdapter {
  readonly type: InputType;
  /** Returns true if this adapter can handle the raw input string. */
  canHandle(rawInput: string): boolean;
  /** Normalizes the raw input into ExtractedContent. */
  extract(rawInput: string, language?: LanguageMode): Promise<ExtractedContent>;
}

/** Registry that resolves the right adapter for a given input. */
export class InputAdapterRegistry {
  private adapters: InputAdapter[] = [];

  register(adapter: InputAdapter): this {
    this.adapters.push(adapter);
    return this;
  }

  resolve(rawInput: string): InputAdapter {
    const match = this.adapters.find((a) => a.canHandle(rawInput));
    if (!match) {
      throw new Error(`No input adapter matched: ${rawInput.slice(0, 80)}`);
    }
    return match;
  }

  /** Detect the most likely input type without throwing. */
  detect(rawInput: string): InputType | null {
    return this.adapters.find((a) => a.canHandle(rawInput))?.type ?? null;
  }
}
