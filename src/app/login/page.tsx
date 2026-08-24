"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ScanSearch, Mail, KeyRound, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/check";

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    setDevCode(null);

    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.[0]?.message ?? data.error ?? "Failed to send code");
        return;
      }
      setStep("code");
      if (data.devCode) {
        setDevCode(data.devCode);
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Invalid or expired code");
        return;
      }
      router.push(redirect);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="w-full space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
            <ScanSearch className="h-6 w-6" strokeWidth={2.2} />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight">FactChecker</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {step === "email" ? "Sign in to save your fact-checks" : "Enter the code we sent you"}
            </p>
          </div>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {step === "email" ? (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" strokeWidth={2} />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    disabled={loading}
                    autoFocus
                    className="w-full rounded-xl border border-zinc-300 bg-white py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="group flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  <>
                    Send login code
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.2} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label htmlFor="code" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  6-digit code
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" strokeWidth={2} />
                  <input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    required
                    disabled={loading}
                    autoFocus
                    className="w-full rounded-xl border border-zinc-300 bg-white py-3 pl-10 pr-4 text-center text-lg font-mono tracking-[0.5em] outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
              </div>

              {devCode && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
                  <span className="font-semibold">Dev mode:</span> your code is{" "}
                  <span className="font-mono font-bold tracking-wider">{devCode}</span>
                </div>
              )}

              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="group flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.2} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError(null);
                  setDevCode(null);
                }}
                className="flex w-full cursor-pointer items-center justify-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                <ArrowLeft className="h-3 w-3" strokeWidth={2} />
                Use a different email
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-zinc-400">
          One-time sign-in. No password needed — we&apos;ll send a code to your email.
        </p>
      </div>
    </main>
  );
}
