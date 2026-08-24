import { VerificationEngine } from "./core/engine";
import { inputRegistry } from "../input";
import { aiOrchestrator, judgeOrchestrator, judgeModel, claimExtractor } from "../ai";
import { sourceAggregator } from "../scraping";

/**
 * Singleton verification engine wired with the full multi-AI orchestration:
 * - aiOrchestrator: routes media analysis to the best specialist
 * - claimExtractor: Nemotron-3 Super 120B (1M context, fast MoE) for claim extraction
 * - judgeOrchestrator: ensemble models + judge for per-claim evaluation
 * - judgeModel: final verdict synthesis
 */
export const verificationEngine = new VerificationEngine(
  inputRegistry,
  aiOrchestrator,
  sourceAggregator,
  judgeOrchestrator,
  judgeModel,
  claimExtractor,
);

export { VerificationEngine } from "./core/engine";
