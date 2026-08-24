import { NextRequest } from "next/server";
import { z } from "zod";
import { verificationEngine } from "@/lib/verification";
import { prismaRepository } from "@/lib/storage/prisma-repository";
import { LANGUAGE_MODES, type LanguageMode, type ProgressEvent } from "@/lib/types";
import { getUserId } from "@/lib/auth/get-session";

export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z.object({
  input: z.string().min(1, "input is required").max(2000),
  language: z.enum(LANGUAGE_MODES).default("en"),
});

// POST /api/fact-check/stream — submit a fact-check with streamed progress
export async function POST(req: NextRequest) {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof z.ZodError ? err.issues : "Invalid body" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const userId = await getUserId();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ProgressEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        const language: LanguageMode = parsed.language;
        const result = await verificationEngine.verify(parsed.input, send, language);
        const saved = await prismaRepository.save(result, userId ?? undefined);

        // Send the final result with the saved ID
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ step: "result", result: saved })}\n\n`),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Verification failed";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ step: "error", error: message })}\n\n`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
