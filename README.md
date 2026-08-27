# FactChecker

A multi-AI fact-checking engine. Drop in a URL, YouTube video, podcast, image, news article, or social post. FactChecker extracts every verifiable claim, gathers 50-100 sources per claim, runs an ensemble of AI models to debate the evidence, and lets a dedicated judge model hand down the final verdict.

## Key Features

- **Multi-format input** — URLs, YouTube videos, podcasts, images, articles, books, social posts
- **Claim extraction** — breaks content into individual verifiable claims, not just headline checking
- **Multi-perspective evidence** — searches 50-100 sources per claim across multiple adapters (Tavily, Google News, Yahoo, Bing, direct fetch)
- **5-model ensemble** — independent evaluations from 5 AI models across 4 different provider pipes
- **Cross-examination** — models see each other's verdicts and can revise positions based on dissenting evidence
- **Judge adjudication** — a stronger judge model reviews everything and issues a final verdict with confidence score
- **Streaming UI** — watch the full pipeline unfold in real time
- **Passwordless auth** — email OTP login so fact-checks are private to each user
- **Open source** — built with Next.js 16, TypeScript, Prisma, PostgreSQL, Tailwind CSS

## Tech Stack

- **Framework:** [Next.js 16.3.2](https://nextjs.org/) (App Router, Turbopack)
- **Language:** [TypeScript 5.x](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Database / ORM:** [Prisma 6.x](https://www.prisma.io/) + PostgreSQL
- **Authentication:** jose (JWT sessions) + passwordless email OTP
- **Testing:** [Vitest](https://vitest.dev/)
- **Package manager:** [pnpm](https://pnpm.io/)
- **AI Providers:** NVIDIA NIM, Groq, OpenRouter, Google Gemini, FreeLLMAPI
- **Deployment target:** Vercel (or any Node.js host)

## Architecture Overview

### Directory Structure

```
src/
├── app/                 # Next.js App Router pages and API routes
│   ├── api/             # Backend API routes
│   ├── check/           # Fact-check input and results pages
│   ├── history/         # User's past fact-checks
│   └── login/           # Passwordless OTP login
├── components/          # Reusable React components
├── lib/
│   ├── ai/              # AI provider orchestration layer
│   │   ├── judge/       # Ensemble → cross-examine → judge pipeline
│   │   ├── gemini/      # Gemini provider (multimodal / media)
│   │   ├── nim/         # NVIDIA NIM providers
│   │   ├── groq/        # Groq provider
│   │   ├── openrouter/  # OpenRouter provider
│   │   ├── freellmapi/  # FreeLLMAPI fallback router
│   │   └── types.ts     # AiProvider / AiOrchestrator contracts
│   ├── auth/            # Session, OTP, get-session utilities
│   ├── db/              # Prisma client setup
│   ├── input/           # Input parsing (URL, video, image, etc.)
│   ├── scraping/        # Web / search / RSS source adapters
│   ├── storage/         # Repository pattern over Prisma
│   ├── types/           # Shared domain types
│   └── verification/    # Claim extraction, evidence, verdict synthesis
└── proxy.ts             # Next.js 16 Proxy (replaces middleware) for auth
```

### Pipeline Flow

```
User Input
    ↓
Input Parsing  →  detect format, fetch transcripts, extract text
    ↓
Claim Extraction  →  break into individual verifiable claims
    ↓
Evidence Gathering  →  5 source adapters per claim
    ↓
Ensemble Evaluation  →  5 AI models debate each claim
    ↓
Cross-Examination  →  models see & respond to each other
    ↓
Judge Adjudication  →  final verdict + confidence
    ↓
Result Streaming  →  UI updates in real time
```

### Multi-AI Orchestration

- **Provider abstraction:** every AI backend implements a single `AiProvider` interface
- **Capability routing:** tasks route by capability (vision goes to Gemini, text goes to the ensemble)
- **Cascading fallbacks:** if a provider fails, the orchestrator tries the next one automatically
- **Rate-limit distribution:** the 5 ensemble models are spread across 4 different providers so one quota doesn't collapse
- **Batch path:** for multi-claim inputs, each provider evaluates all claims in one call to reduce request count from `5N` to roughly `N + 6`

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or higher
- [pnpm](https://pnpm.io/) 9 or higher
- [PostgreSQL](https://www.postgresql.org/) (local or hosted, e.g. Neon)
- Free API keys from at least one AI provider (see Environment Variables below)

## Getting Started

### 1. Clone and install

```bash
git clone <your-repo-url>
cd factChecker
pnpm install
```

### 2. Set up the database

Create a PostgreSQL database and update the connection string in `.env`:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/factchecker?schema=public"
```

Then push the schema and generate the Prisma client:

```bash
pnpm exec prisma migrate dev
pnpm exec prisma generate
```

### 3. Environment variables

Copy the example file and fill in your keys:

```bash
cp .env.example .env
```

| Variable | Description | Where to get |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | Your database provider |
| `NIM_API_KEY` | NVIDIA NIM (Nemotron-3, Llama 3.1) | https://build.nvidia.com |
| `GEMINI_API_KEY` | Google Gemini 3.5 Flash (multimodal) | https://aistudio.google.com |
| `GROQ_API_KEY` | Groq GPT-OSS 120B (fast text) | https://console.groq.com |
| `OPENROUTER_API_KEY` | OpenRouter (GLM-5.2, others) | https://openrouter.ai |
| `TAVILY_API_KEY` | Tavily AI web search | https://tavily.com |
| `FREELLMAPI_KEY` | Optional local fallback router | https://github.com/tashfeenahmed/freellmapi |
| `GMAIL_USER` | Gmail address for sending OTP emails | Your Google account |
| `GMAIL_APP_PASSWORD` | App password for OTP email | Google Account → Security → App passwords |

At least one AI provider key is required for the engine to work.

### 4. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm build` | Generate Prisma client and build the Next.js app for production |
| `pnpm start` | Start the production server (run after `pnpm build`) |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript with no emit |
| `pnpm test` | Run the Vitest test suite |
| `pnpm prepush:check` | Run `lint` + `typecheck` (used by the pre-push git hook) |
| `pnpm exec prisma migrate dev` | Run Prisma migrations in development |
| `pnpm exec prisma generate` | Regenerate the Prisma client |
| `pnpm exec prisma studio` | Open Prisma Studio to inspect the database |

## Environment Variables Reference

### Required

- `DATABASE_URL` — PostgreSQL connection string.
- At least one of `NIM_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, or `OPENROUTER_API_KEY`.

### Optional but recommended

- `TAVILY_API_KEY` — enables AI web search for evidence gathering.
- `GMAIL_USER` + `GMAIL_APP_PASSWORD` — sends real OTP login emails. Without these, OTP codes are printed to the server console in dev mode only (not for production).

### Optional fallbacks

- `FREELLMAPI_KEY` + `FREELLMAPI_BASE_URL` — routes multiple free providers through a local OpenAI-compatible fallback proxy.

## Authentication

FactChecker uses passwordless email login:

1. User enters their email on `/login`
2. A 6-digit OTP code is generated and sent to that email
3. User enters the code to receive a JWT session cookie
4. `src/proxy.ts` (Next.js 16 Proxy) protects `/check`, `/history`, and `/api/fact-check/*` routes

In development, if `GMAIL_USER` and `GMAIL_APP_PASSWORD` are not set, the OTP code is printed to the terminal so you can sign in without email.

## Testing

```bash
# Run unit tests
pnpm test

# Run lint
pnpm lint

# Run type checking
pnpm typecheck
```

Git hooks:

- **Pre-commit** — runs `lint-staged` to fix staged `*.{ts,tsx,js,jsx}` files
- **Pre-push** — runs `pnpm prepush:check` (lint + typecheck) and blocks the push if it fails

## Deployment

### Vercel

This project is set up for Vercel:

1. Import the GitHub repository into Vercel
2. Set the **Framework Preset** to **Next.js**
3. Add all environment variables from your `.env`
4. The build command `prisma generate && next build` runs automatically, generating the Prisma client before the Next.js build

### Other platforms

Set these build-time values:

| Field | Value |
| --- | --- |
| Build Command | `pnpm build` or `prisma generate && next build` |
| Install Command | `pnpm install` |
| Output Directory | `.next` |

Then start with `pnpm start`.

## Important Notes

- **Free API rate limits:** the engine runs on free-tier AI APIs. Heavy or repeated use will hit rate limits quickly. It is best for checking one claim at a time, not bulk processing.
- **Prisma client must be generated before build:** the `build` and `postinstall` scripts handle this automatically, but if you see `Prisma.FactCheckGetPayload` type errors, run `pnpm exec prisma generate`.
- **Next.js 16 differences:** this project uses Next.js 16 conventions. `src/proxy.ts` is the new replacement for `src/middleware.ts`.

## License

Open source. See the repository license for details.
