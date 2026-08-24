"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Loader2, RefreshCw, User, Bot } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  updatedVerdict?: string | null;
  updatedConfidence?: number | null;
}

interface ChatPanelProps {
  factCheckId: string;
  initialMessages: Message[];
}

export function ChatPanel({ factCheckId, initialMessages }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`/api/fact-check/${factCheckId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Chat failed");

      const assistantMsg: Message = {
        role: "assistant",
        content: data.reply,
        updatedVerdict: data.updatedVerdict,
        updatedConfidence: data.updatedConfidence,
      };
      setMessages((m) => [...m, assistantMsg]);

      if (data.updatedVerdict) {
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Something went wrong"}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header */}
      <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-zinc-500">
          <MessageSquare className="h-4 w-4" strokeWidth={2} />
          Chat with AI
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Ask questions, provide counter-arguments, or paste content that couldn&apos;t be scraped.
          The AI will re-evaluate with your input.
        </p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="max-h-96 space-y-3 overflow-y-auto p-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
              <MessageSquare className="h-5 w-5 text-zinc-400" strokeWidth={1.8} />
            </div>
            <p className="mt-3 text-sm text-zinc-400">
              Start the conversation — ask why the verdict was reached, or provide additional context.
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
              msg.role === "user"
                ? "bg-emerald-600 text-white"
                : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
            }`}>
              {msg.role === "user" ? <User className="h-3.5 w-3.5" strokeWidth={2} /> : <Bot className="h-3.5 w-3.5" strokeWidth={2} />}
            </div>
            <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm ${
              msg.role === "user"
                ? "bg-emerald-600 text-white"
                : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
            }`}>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              {msg.updatedVerdict && (
                <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <RefreshCw className="h-3 w-3 animate-spin" strokeWidth={2} />
                  Verdict updated: {msg.updatedVerdict.replace(/_/g, " ")}
                  {msg.updatedConfidence != null && ` (${msg.updatedConfidence}% confidence)`}
                  <span className="text-zinc-400">— refreshing...</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
              <Bot className="h-3.5 w-3.5" strokeWidth={2} />
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-zinc-100 px-3.5 py-2.5 text-sm text-zinc-400 dark:bg-zinc-800">
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
              thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Paste a transcript, ask a question, or provide a counter-argument..."
            rows={2}
            className="flex-1 resize-none rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900"
            disabled={loading}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} />
            ) : (
              <Send className="h-4 w-4" strokeWidth={2.2} />
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
