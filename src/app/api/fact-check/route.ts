import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verificationEngine } from "@/lib/verification";
import { prismaRepository } from "@/lib/storage/prisma-repository";
import { LANGUAGE_MODES, type LanguageMode } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60; // verification can take a while

const Body = z.object({
  input: z.string().min(1, "input is required").max(2000),
  language: z.enum(LANGUAGE_MODES).default("en"),
});

// POST /api/fact-check — submit a new fact-check
export async function POST(req: NextRequest) {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues : "Invalid body" },
      { status: 400 },
    );
  }

  try {
    const language: LanguageMode = parsed.language;
    const result = await verificationEngine.verify(parsed.input, undefined, language);
    const saved = await prismaRepository.save(result);
    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/fact-check — list history (paginated)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);
  const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);
  const items = await prismaRepository.list(limit, offset);
  return NextResponse.json({ items, limit, offset });
}
