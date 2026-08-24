import type { AiTask, EvaluatedClaim, Source } from "../types";

/**
 * AiProvider — every AI backend (Gemini, Groq, OpenRouter, etc.) implements this.
 * The orchestrator routes tasks to providers based on capability + availability.
 *
 * Capabilities:
 *  - text:     text generation / reasoning
 *  - vision:   image understanding
 *  - audio:    audio transcription
 *  - video:    video understanding
 *  - search:   built-in web grounding (no separate scraping needed)
 */
export interface AiProvider {
  readonly name: string;
  readonly capabilities: readonly Capability[];
  /** True if the provider is configured (has API key, etc.) and ready to call. */
  isAvailable(): boolean;
  /** Execute a task. Throws on failure so the orchestrator can fall back. */
  run(task: AiTask): Promise<string>;
  /**
   * Execute a task with streaming. Calls onToken for each text chunk as it
   * arrives. Returns the full text at the end. Throws on failure.
   */
  runStream(task: AiTask, onToken: (chunk: string) => void): Promise<string>;
}

export type Capability = "text" | "vision" | "audio" | "video" | "search";

/**
 * The orchestrator routes an AiTask to the best available provider that has the
 * required capability. It tries providers in priority order and falls back on
 * error. This keeps the engine decoupled from any single AI vendor.
 */
export class AiOrchestrator {
  constructor(private providers: AiProvider[]) {
    // Sort once by a simple priority: providers with more capabilities first.
    this.providers.sort((a, b) => b.capabilities.length - a.capabilities.length);
  }

  async run(task: AiTask): Promise<string> {
    const required = requiredCapability(task);
    const candidates = this.providers.filter(
      (p) => p.isAvailable() && p.capabilities.includes(required),
    );
    if (candidates.length === 0) {
      throw new Error(`No available AI provider for capability: ${required}`);
    }
    let lastError: unknown;
    for (const provider of candidates) {
      try {
        return await provider.run(task);
      } catch (err) {
        lastError = err;
        // Try the next provider.
      }
    }
    throw new Error(`All AI providers failed for ${required}: ${String(lastError)}`);
  }
}

function requiredCapability(task: AiTask): Capability {
  switch (task.kind) {
    case "extract-claims":
      return "text";
    case "analyze-media":
      return "vision";
    case "evaluate-claim":
      return "text";
    case "evaluate-claims":
      return "text";
    case "synthesize-verdict":
      return "text";
    case "raw-text":
      return "text";
  }
}

// Re-export domain types the engine needs so it imports from one place.
export type { AiTask, EvaluatedClaim, Source };
