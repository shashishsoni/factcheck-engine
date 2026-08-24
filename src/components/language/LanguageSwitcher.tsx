"use client";

import type { LanguageMode } from "@/lib/types";
import { t } from "./translations";

const LANGUAGE_OPTIONS = [
  { value: "en", labelKey: "english" },
  { value: "hi", labelKey: "hindi" },
] as const;

export function LanguageSwitcher({
  language,
  onChange,
}: {
  language: LanguageMode;
  onChange: (language: LanguageMode) => void;
}) {
  return (
    <fieldset className="flex items-center gap-2 border-0 p-0">
      <legend className="text-xs text-zinc-400">{t(language, "languageLabel")}:</legend>
      {LANGUAGE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={language === option.value}
          onClick={() => onChange(option.value)}
          className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 ${
            language === option.value
              ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
              : "border-zinc-200 bg-white text-zinc-500 hover:border-emerald-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-emerald-700"
          }`}
        >
          {t(language, option.labelKey)}
        </button>
      ))}
    </fieldset>
  );
}
