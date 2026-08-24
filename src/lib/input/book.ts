import type { InputAdapter } from "./types";

// ISBN-10 or ISBN-13, with or without hyphens.
const ISBN_RE = /^(97(?:8|9))?\d{9}[\dX]$/i;

/**
 * Book adapter — accepts an ISBN (10 or 13) or a Google Books / Open Library URL.
 * Resolves metadata via the Open Library API (free, no key required).
 */
export const bookAdapter: InputAdapter = {
  type: "book",
  canHandle(rawInput) {
    const v = rawInput.trim().replace(/[-\s]/g, "");
    if (ISBN_RE.test(v)) return true;
    return /(books\.google\.com|openlibrary\.org|goodreads\.com\/book)/i.test(rawInput);
  },
  async extract(rawInput) {
    const v = rawInput.trim();
    const isbn = v.replace(/[-\s]/g, "");
    let metadata: Record<string, string> = { input: v };
    let preview = `Book: ${v}`;
    let textContent: string | undefined;

    if (ISBN_RE.test(isbn)) {
      try {
        const res = await fetch(
          `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
          { signal: AbortSignal.timeout(10_000) },
        );
        const data = (await res.json()) as Record<string, unknown>;
        const book = data[`ISBN:${isbn}`] as
          | { title?: string; authors?: { name?: string }[]; publish_date?: string; notes?: string }
          | undefined;
        if (book) {
          metadata = {
            ...metadata,
            title: book.title ?? "",
            authors: (book.authors ?? []).map((a) => a.name).join(", "),
            published: book.publish_date ?? "",
          };
          preview = `Book: ${book.title ?? v}`;
          textContent = [book.title, book.notes].filter(Boolean).join("\n\n");
        }
      } catch {
        // Best-effort — fall through with whatever we have.
      }
    }

    return {
      inputType: "book",
      rawInput: v,
      preview,
      textContent,
      metadata,
    };
  },
};
