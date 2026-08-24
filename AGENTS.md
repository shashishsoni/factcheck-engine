<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## FactChecker — project commands

- **Package manager:** pnpm (not npm). Always use `pnpm install`, `pnpm build`, `pnpm dev`, `pnpm lint`.
- **Build:** `pnpm build`
- **Dev:** `pnpm dev`
- **Lint:** `pnpm lint`
- **Test:** `pnpm test` (vitest)
- **Prisma generate:** `pnpm exec prisma generate`
- **Prisma migrate:** `pnpm exec prisma migrate dev`
- **Env:** copy `.env.example` to `.env` and fill in `DATABASE_URL`, `NIM_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, and optionally `GROQ_API_KEY` / `TAVILY_API_KEY` / `SUPADATA_API_KEY` (social video transcripts: YouTube, Facebook, Instagram, TikTok, X) / `CAPTAPI_API_KEY` (Facebook/Instagram transcript fallback) / `FREELLMAPI_KEY` + `FREELLMAPI_BASE_URL` + `FREELLMAPI_MODEL` (self-hosted fallback router — see FreeLLMAPI section below).

## AI model lineup (verified 2026-08-22)

All models verified alive on their respective providers.

### NVIDIA NIM (free, one NIM_API_KEY from build.nvidia.com)

- `nvidia/nemotron-3-ultra-550b-a55b` — 550B, strongest on NIM → **judge** + ensemble
- `nvidia/nemotron-3-super-120b-a12b` — 120B → **ensemble**
- `meta/llama-3.1-70b-instruct` — 70B → **ensemble** + claim extraction
- Dead on NIM (end-of-life 2026-08-07/21): `deepseek-ai/deepseek-v4-pro`, `deepseek-ai/deepseek-v4-flash`, `qwen/qwen3.5-397b-a17b`, `moonshotai/kimi-k2-instruct`

### Google Gemini (free, GEMINI_API_KEY from aistudio.google.com)

- `gemini-3.5-flash` — multimodal (vision/audio/video) + search grounding → **media analysis**
- Dead: `gemini-2.5-pro` (no longer available to new users)

### Groq (free, GROQ_API_KEY from console.groq.com)

- `openai/gpt-oss-120b` — 120B, fast → **text fallback**
- Dead: `llama-3.3-70b-versatile` (model_not_found)

### OpenRouter (free, OPENROUTER_API_KEY from openrouter.ai)

- `z-ai/glm-5.2:free` — 1M context reasoning → **ensemble**
- `qwen/qwen3-next-80b-a3b-instruct` — 80B MoE → **ensemble** (paid slug; `:free` variant dead 2026-08-24)
- `poolside/laguna-s-2.1:free` — 118B coding/reasoning → **ensemble**
- Dead: `openrouter/owl-alpha` (no endpoints found, 2026-08-24), `qwen/qwen3-next-80b-a3b-instruct:free` (404, use paid slug), `google/gemma-4-31b-it:free` (removed — frequently 429 rate-limited upstream 2026-08-24)

### FreeLLMAPI (optional, self-hosted fallback router — https://github.com/tashfeenahmed/freellmapi)

Not a model provider — a local OpenAI-compatible proxy that aggregates your existing NIM/Groq/OpenRouter/Gemini/etc. keys behind one endpoint (`http://localhost:3001/v1`) with automatic failover across 34 providers / 600+ free model endpoints. Used here as a **fallback pool**: only kicks in when primary providers rate-limit or fail.

- Run locally: `docker run -p 3001:3001 ghcr.io/tashfeenahmed/freellmapi` or desktop app from releases page
- Add your provider keys in the dashboard at `http://localhost:3001`, then export the unified key as `FREELLMAPI_KEY`
- `FREELLMAPI_MODEL` defaults to `meta/llama-3.1-70b-instruct`; browse the catalog at https://freellmapi.co/models
- Router is free + open source; the $19/yr premium tier only speeds up catalog updates (same-day vs 30-day lag)
- Wired as the last entry in both `aiOrchestrator` and the judge ensemble — `evaluateClaim` slices to first 5 *available*, so it only joins when a primary is down
