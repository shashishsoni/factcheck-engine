import type { AiProvider } from "../types";
import type { AiTask } from "../../types";

export function withFallback(primary: AiProvider, fallback: AiProvider): AiProvider {
  return {
    name: primary.name,
    capabilities: primary.capabilities,
    isAvailable: () => primary.isAvailable() || fallback.isAvailable(),
    async run(task: AiTask): Promise<string> {
      if (primary.isAvailable()) {
        try {
          return await primary.run(task);
        } catch (primaryErr) {
          if (fallback.isAvailable()) {
            return fallback.run(task);
          }
          throw primaryErr;
        }
      }
      if (fallback.isAvailable()) return fallback.run(task);
      throw new Error(`${primary.name}: not configured (no primary or fallback available)`);
    },
    async runStream(task: AiTask, onToken: (chunk: string) => void): Promise<string> {
      if (primary.isAvailable()) {
        try {
          return await primary.runStream(task, onToken);
        } catch (primaryErr) {
          if (fallback.isAvailable()) {
            return fallback.runStream(task, onToken);
          }
          throw primaryErr;
        }
      }
      if (fallback.isAvailable()) return fallback.runStream(task, onToken);
      throw new Error(`${primary.name}: not configured (no primary or fallback available)`);
    },
  };
}
