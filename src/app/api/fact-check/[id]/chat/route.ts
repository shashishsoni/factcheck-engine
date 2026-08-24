import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verificationEngine } from "@/lib/verification";
import { prismaRepository } from "@/lib/storage/prisma-repository";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  message: z.string().min(1, "message is required").max(5000),
});

// POST /api/fact-check/[id]/chat — send a message in the chat conversation
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.issues : "Invalid body" },
      { status: 400 },
    );
  }

  // Load the original fact-check
  const original = await prismaRepository.getById(id);
  if (!original) {
    return NextResponse.json({ error: "Fact-check not found" }, { status: 404 });
  }

  // Load conversation history
  const history = (original.messages ?? []).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Save the user's message
  await prismaRepository.saveMessage(id, {
    role: "user",
    content: parsed.message,
  });

  try {
    // Run the AI re-evaluation
    const { reply, result } = await verificationEngine.reverify(
      original,
      parsed.message,
      history,
    );

    // Save the assistant's reply
    await prismaRepository.saveMessage(id, {
      role: "assistant",
      content: reply,
      updatedVerdict: result?.verdict ?? null,
      updatedConfidence: result?.confidence ?? null,
      updatedSummary: result?.summary ?? null,
    });

    // If the verdict was updated, persist the new verdict on the fact-check
    if (result?.verdict && result.confidence != null) {
      await prismaRepository.updateVerdict(
        id,
        result.verdict,
        result.confidence,
        result.summary,
      );
    }

    return NextResponse.json({
      reply,
      updatedVerdict: result?.verdict ?? null,
      updatedConfidence: result?.confidence ?? null,
      updatedSummary: result?.summary ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
