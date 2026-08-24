# LinkedIn Post — FactChecker

---

I built a multi-AI fact-checking engine that doesn't just ask "is this true?" — it runs a courtroom.

Most "AI fact-checkers" send your claim to one model and trust whatever it says. FactChecker takes a different approach: it runs an ensemble debate across 5 independent AI models, cross-examines their reasoning, and lets a dedicated judge model adjudicate the final verdict — with cited evidence from 50+ sources.

Here's how it works:

**1. Input extraction (any format)**
Drop in a URL, YouTube video, podcast, image, news article, book ISBN, or social media post. The system auto-detects the format, pulls transcripts via Supadata/Gemini, and extracts every verifiable claim — not just the headline.

**2. Evidence gathering (multi-perspective)**
Each claim gets searched across 5 source adapters in parallel — Tavily AI search, Google News RSS, Yahoo, Bing RSS, and direct fetch. Evidence is split into three buckets: supporting, contradicting, and contextual. No confirmation bias.

**3. Ensemble evaluation (5 models debate)**
Five different AI models evaluate each claim independently, each running on a different provider to avoid rate limits:
• DeepSeek V4 Pro (1M context, via NavyAI)
• Nemotron-3 Ultra 550B (NVIDIA NIM)
• GPT-OSS 120B (Groq)
• GLM-5.2 (OpenRouter, 1M context)
• Nemotron-3 Super 120B (NIM)

**4. Cross-examination**
Each model sees the others' verdicts and can revise its position. Agreement, disagreement, and revised confidence are all tracked.

**5. Judge adjudication**
Grok 4.3 (89/100 intelligence score, 1M context) reviews all evaluations + cross-examinations and issues the final verdict with a confidence score. Nemotron Ultra 550B serves as fallback judge.

**6. Verdict synthesis**
The judge produces a plain-language summary + detailed reasoning, with every claim individually verdicted and every source cited.

**The orchestration architecture behind it:**

The engine isn't just "call 5 APIs and average the results." It's a multi-layer orchestration system:

→ **Provider abstraction layer** — every AI backend (NIM, Groq, OpenRouter, Gemini, FreeLLMAPI) implements a unified `AiProvider` interface with capability declarations (text, vision, audio, video, search). The orchestrator routes tasks to the best available provider for the required capability and falls back automatically on failure.

→ **Capability-based routing** — vision tasks go to Gemini (only provider with vision), text reasoning goes to the ensemble, media analysis is capability-matched, not hardcoded. Adding a new provider is one function call — no pipeline changes.

→ **Cascading fallback chains** — every critical role has a primary + fallback. Judge: Grok 4.3 → Nemotron Ultra 550B. Claim extractor: NIM Nemotron Super → FreeLLMAPI Nemotron Super. If a provider rate-limits or fails, the next in the chain takes over transparently. No single point of failure.

→ **Rate-limit-aware provider distribution** — the 5 ensemble models are deliberately spread across 4 different provider pipes (NavyAI, NIM, Groq, OpenRouter), each with its own RPM budget. Putting 5 models on one provider would collapse the quota instantly. Provider diversity is a first-class architectural decision, not an afterthought.

→ **Batch orchestration path** — for multi-claim inputs, each provider evaluates ALL claims in a single call, then batch cross-examine, then batch judge. This collapses request count from 5N + N² + N down to ~N + 6. The orchestrator picks single vs. batch path automatically based on claim count.

→ **Pipeline coordination** — the `JudgeOrchestrator` coordinates the full ensemble → cross-examine → judge pipeline as a stateful flow, with progress callbacks streaming each phase to the UI in real time. You watch the debate unfold live, not just the final answer.

**What makes it different from "just ask GPT":**

→ Multi-model ensemble, not single-model opinion
→ Cross-examination phase where models challenge each other
→ Per-claim evidence separation (prevents date/entity conflation across claims)
→ 50+ sources per claim, not 1-2
→ Calibrated confidence scores, not binary true/false
→ "Unverifiable" is a valid answer — it never guesses
→ Batch evaluation: all claims in one model call per provider (saves rate limits)
→ Cascading fallbacks — no single provider failure can kill a fact-check
→ Capability-based provider routing — add a provider in one function call
→ Passwordless email OTP auth — your fact-checks are private to you
→ Real-time streaming UI — watch the pipeline unfold live

**Tech stack:**
Next.js 16, TypeScript, Prisma + Neon Postgres, Vitest, Tailwind CSS, jose (JWT auth), Cheerio (scraping). 5 AI providers behind a unified orchestration layer: NVIDIA NIM, Groq, OpenRouter, Google Gemini, FreeLLMAPI/NavyAI.

**What I learned building this:**

• Free-tier AI APIs have aggressive rate limits. Running 5 models in parallel per claim across N claims simultaneously will collapse every quota instantly. The fix: batch all claims into one model call per provider, and spread models across different provider pipes (NIM, Groq, OpenRouter, NavyAI) so each has its own rate limit budget.

• Multi-model ensembles only work if models actually disagree. If you put 5 similar models on the same provider, you get 5 similar answers. Provider diversity matters more than model count.

• Cross-examination is where the magic happens. Models that initially agree will sometimes flip after seeing a dissenting opinion with strong evidence. That's the whole point.

The code is open source. Link in comments.

#AI #FactChecking #LLM #MultiModel #NextJS #TypeScript #OpenSource #NVIDIA #Groq #OpenRouter #Gemini #DeepSeek #Grok
