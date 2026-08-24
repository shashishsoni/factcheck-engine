import { AiOrchestrator } from "./types";
import { createNimProvider } from "./nim";
import { createGeminiProvider } from "./gemini/provider";
import { createGroqProvider } from "./groq";
import { createOpenRouterProvider } from "./openrouter";
import { createFreeLlmApiProvider } from "./freellmapi";
import { withFallback } from "./shared/with-fallback";
import { JudgeOrchestrator } from "./judge/orchestration";

/**
 * === MULTI-AI ORCHESTRATION ===
 *
 * Load is spread across DIFFERENT providers to avoid rate limits.
 * Each ensemble model uses a different provider pipe:
 *   - NavyAI (via FreeLLMAPI): 20 RPM — only 1 ensemble model + judge
 *   - NIM: 40 RPM — 2 ensemble models + extractor
 *   - Groq: separate quota — 1 ensemble model
 *   - OpenRouter: separate quota — 1 ensemble model
 *
 * JUDGE (final adjudicator — strongest reasoning):
 *   1. Grok 4.3 (FreeLLMAPI/NavyAI) — 89/100 intelligence, 1M context
 *   2. Nemotron-3 Ultra 550B (NIM) — fallback if Grok 4.3 rate-limited
 *
 * ENSEMBLE (claim evaluation — 5 models, each on a different provider):
 *   1. DeepSeek V4 Pro (FreeLLMAPI/NavyAI) — 1M context, strongest reasoning
 *   2. Nemotron-3 Ultra 550B (NIM) — 550B reasoning
 *   3. Groq GPT-OSS 120B (Groq) — fast 120B
 *   4. OpenRouter GLM-5.2 (OpenRouter) — 1M context reasoning
 *   5. Nemotron-3 Super 120B (NIM) — 120B, different NIM model
 *
 * SPECIALIST:
 *   - Claim extraction → Nemotron-3 Super 120B (NIM primary, FreeLLMAPI fallback)
 *   - Media analysis   → Gemini 3.5 Flash
 *   - Verdict synthesis → Grok 4.3 (the judge)
 *
 * Keys:
 *   NIM_API_KEY         — build.nvidia.com
 *   GROQ_API_KEY        — console.groq.com
 *   OPENROUTER_API_KEY  — openrouter.ai
 *   GEMINI_API_KEY      — aistudio.google.com (media analysis only)
 *   FREELLMAPI_KEY      — local FreeLLMAPI router (NavyAI + NIM + Groq + OR + Gemini)
 */

// --- NIM providers (40 RPM shared across NIM models) ---
const nimNemotronUltra = createNimProvider("nim-nemotron-ultra", "nvidia/nemotron-3-ultra-550b-a55b");
const nimNemotronSuper = createNimProvider("nim-nemotron-super", "nvidia/nemotron-3-super-120b-a12b");

// --- Groq (separate rate limit) ---
const groq = createGroqProvider();

// --- OpenRouter (separate rate limit) ---
const orGlm52 = createOpenRouterProvider("or-glm-5.2", "z-ai/glm-5.2:free");

// --- FreeLLMAPI providers (NavyAI pipe — 20 RPM, use sparingly) ---
const flGrok43 = createFreeLlmApiProvider("fl-grok-4.3", "grok-4.3", { temperature: 0.1 });
const flDeepSeekV4Pro = createFreeLlmApiProvider("fl-deepseek-v4-pro", "deepseek-v4-pro");
const flNemotronSuper = createFreeLlmApiProvider("fl-nemotron-super", "nemotron-3-super-120b", {
  temperature: 0.1,
});

// --- Judge: Grok 4.3 primary (strongest), Nemotron Ultra fallback ---
const judgeInstance = withFallback(flGrok43, nimNemotronUltra);

// --- Specialists ---
const gemini = createGeminiProvider(); // multimodal media analysis
const claimExtractor = withFallback(
  nimNemotronSuper, // NIM direct — fast for extraction
  flNemotronSuper, // FreeLLMAPI fallback if NIM rate-limits
);

export const aiOrchestrator = new AiOrchestrator([
  gemini, // vision — media analysis (only provider with vision capability)
  flDeepSeekV4Pro,
  nimNemotronUltra,
  groq,
  orGlm52,
  nimNemotronSuper,
]);

export const judgeOrchestrator = new JudgeOrchestrator(
  // 5 models, each on a DIFFERENT provider pipe to avoid rate limits:
  //   NavyAI (fl-deepseek) | NIM (nim-ultra) | Groq | OpenRouter (or-glm) | NIM (nim-super)
  [flDeepSeekV4Pro, nimNemotronUltra, groq, orGlm52, nimNemotronSuper],
  judgeInstance,
);

export const judgeModel = judgeInstance;
export { claimExtractor };

export type { AiProvider, AiOrchestrator, Capability } from "./types";
export { JudgeOrchestrator } from "./judge/orchestration";
