import Link from "next/link";
import {
  Link2,
  Image,
  Video,
  AudioWaveform,
  FileText,
  Book,
  MessageCircle,
  ScanSearch,
  Search,
  Brain,
  Gavel,
  ArrowRight,
  ShieldCheck,
  Eye,
  Sparkles,
} from "lucide-react";

const INPUT_TYPES = [
  { icon: Link2, label: "URL", desc: "Any web page" },
  { icon: Image, label: "Image", desc: "Photos, screenshots" },
  { icon: Video, label: "Video", desc: "Direct video files" },
  { icon: AudioWaveform, label: "Audio", desc: "Podcasts, recordings" },
  { icon: FileText, label: "Article", desc: "News, blogs, longform" },
  { icon: Book, label: "Book", desc: "ISBN or book URL" },
  { icon: MessageCircle, label: "Social", desc: "Instagram, X, Reddit" },
  { icon: ScanSearch, label: "Any URL", desc: "Auto-detected format" },
];

const STEPS = [
  {
    icon: Search,
    title: "Extract claims",
    desc: "AI pulls every verifiable claim from your input — text, image, audio, or video. Nothing is assumed; only explicit assertions are checked.",
    side: "left" as const,
  },
  {
    icon: Brain,
    title: "Gather evidence",
    desc: "Multiple independent sources are searched in parallel for supporting, contradicting, and contextual evidence. No confirmation bias.",
    side: "right" as const,
  },
  {
    icon: Gavel,
    title: "Verdict + proof",
    desc: "An ensemble of models evaluates each claim. A strict judge adjudicates disagreements. Every verdict comes with citations.",
    side: "left" as const,
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Hero — asymmetric, left-aligned */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-16 pb-12 md:pt-24 md:pb-20">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.4fr_1fr] md:items-center">
          {/* Left: content */}
          <div className="slide-in">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
              Multi-model AI verification
            </div>
            <h1 className="text-4xl font-semibold tracking-tighter leading-[1.05] sm:text-5xl md:text-6xl">
              Verify anything.
              <br />
              <span className="text-zinc-400 dark:text-zinc-500">No bias, just proof.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-lg">
              FactChecker scans multiple independent sources, cross-references
              evidence, and gives you a calibrated verdict with full citations.
              It never guesses — if evidence is thin, it says so.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/check"
                className="group flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:shadow-emerald-600/30 active:translate-y-px"
              >
                Start a fact check
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.2} />
              </Link>
              <Link
                href="/history"
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
              >
                View history
              </Link>
            </div>
          </div>

          {/* Right: visual element — pipeline preview */}
          <div className="hidden md:block slide-in" style={{ animationDelay: "100ms" }}>
            <div className="relative rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/40">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="ml-2 text-xs font-medium text-zinc-400">pipeline preview</span>
              </div>
              <div className="space-y-3">
                {[
                  { icon: ScanSearch, label: "Input analyzed", state: "done" },
                  { icon: Search, label: "18 sources found", state: "done" },
                  { icon: Brain, label: "3 models evaluating...", state: "active" },
                  { icon: Gavel, label: "Judge adjudicating", state: "pending" },
                ].map((s, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${
                      s.state === "done"
                        ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20"
                        : s.state === "active"
                          ? "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30"
                          : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                    }`}
                  >
                    <s.icon
                      className={`h-4 w-4 ${
                        s.state === "done"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : s.state === "active"
                            ? "text-blue-600 dark:text-blue-400 pulse-glow"
                            : "text-zinc-400"
                      }`}
                      strokeWidth={2}
                    />
                    <span className={s.state === "pending" ? "text-zinc-400" : "text-zinc-700 dark:text-zinc-300"}>
                      {s.label}
                    </span>
                    {s.state === "done" && (
                      <span className="ml-auto text-xs text-emerald-600 dark:text-emerald-400">done</span>
                    )}
                    {s.state === "active" && (
                      <div className="ml-auto h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Input types — bento grid */}
      <section className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="mb-8 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Accepts any input type
          </h2>
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-4">
          {INPUT_TYPES.map((t) => (
            <div
              key={t.label}
              className="group cursor-default rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-emerald-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-800"
            >
              <t.icon className="h-5 w-5 text-zinc-400 transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400" strokeWidth={1.8} />
              <div className="mt-3 text-sm font-semibold">{t.label}</div>
              <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{t.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works — zig-zag layout */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 md:py-24">
        <div className="mb-12 text-left md:mb-16">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">How it works</h2>
          <p className="mt-3 max-w-lg text-sm text-zinc-600 dark:text-zinc-400">
            Three stages. Multiple AI models. One strict judge. Zero guessing.
          </p>
        </div>
        <div className="space-y-12 md:space-y-20">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className={`grid grid-cols-1 gap-6 md:grid-cols-2 md:items-center ${s.side === "right" ? "md:[&>*:first-child]:order-2" : ""}`}
            >
              {/* Content */}
              <div className={s.side === "right" ? "md:pr-12" : "md:pl-12"}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
                    <s.icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                    Step {i + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {s.desc}
                </p>
              </div>
              {/* Visual */}
              <div className="hidden md:block">
                <div className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white p-8 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950">
                  <div className="flex items-center justify-center">
                    {i === 0 && (
                      <div className="space-y-2">
                        {["Statement 1: ...", "Statement 2: ...", "Statement 3: ..."].map((c, ci) => (
                          <div key={ci} className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800">
                            <Search className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2} />
                            <span className="text-zinc-600 dark:text-zinc-400">{c}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {i === 1 && (
                      <div className="grid grid-cols-3 gap-2">
                        {["Supporting", "Contradicting", "Contextual"].map((p, pi) => (
                          <div key={pi} className="rounded-lg border border-zinc-200 bg-white p-3 text-center dark:border-zinc-700 dark:bg-zinc-800">
                            <div className={`mx-auto mb-1.5 h-2 w-2 rounded-full ${pi === 0 ? "bg-emerald-500" : pi === 1 ? "bg-red-500" : "bg-zinc-400"}`} />
                            <div className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">{p}</div>
                            <div className="mt-1 text-lg font-bold text-zinc-800 dark:text-zinc-200">{pi === 0 ? 6 : pi === 1 ? 4 : 8}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {i === 2 && (
                      <div className="flex items-center gap-3">
                        <div className="space-y-1.5">
                          {["Model A", "Model B", "Model C"].map((m, mi) => (
                            <div key={mi} className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium dark:border-zinc-700 dark:bg-zinc-800">
                              {m}
                            </div>
                          ))}
                        </div>
                        <ArrowRight className="h-4 w-4 text-zinc-400" strokeWidth={2} />
                        <div className="rounded-lg border-2 border-emerald-500 bg-emerald-50 px-4 py-3 text-center dark:bg-emerald-950/30">
                          <Gavel className="mx-auto h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                          <div className="mt-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">Judge</div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-zinc-400" strokeWidth={2} />
                        <div className="rounded-lg border border-zinc-200 bg-white px-3 py-3 text-center dark:border-zinc-700 dark:bg-zinc-800">
                          <Sparkles className="mx-auto h-5 w-5 text-amber-500" strokeWidth={2} />
                          <div className="mt-1 text-xs font-bold text-zinc-700 dark:text-zinc-300">Verdict</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-24">
        <div className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-emerald-50 to-white p-8 text-center dark:border-zinc-800 dark:from-emerald-950/20 dark:to-zinc-900 md:p-12">
          <Eye className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400" strokeWidth={1.8} />
          <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
            See the AI work in real-time
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
            Watch the multi-model pipeline unfold — claim extraction, evidence gathering,
            ensemble evaluation, and judge adjudication, all streaming live.
          </p>
          <Link
            href="/check"
            className="group mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:translate-y-px"
          >
            Try it now
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.2} />
          </Link>
        </div>
      </section>
    </main>
  );
}
