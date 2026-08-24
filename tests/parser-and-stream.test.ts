import { describe, expect, it, vi } from "vitest";
import { parseBatchCrossExamination, parseBatchEvaluation, parseCrossExamination, parseEvaluation } from "../src/lib/ai/judge/parsers";
import { streamChat, callChat } from "../src/lib/ai/shared/openai-compat";
import { extractJson } from "../src/lib/verification/support/parsers";

describe("evaluation parsers", () => {
  it("parses a JSON array into per-claim evaluations", () => {
    const parsed = parseBatchEvaluation(JSON.stringify([
      { claimIndex: 0, verdict: "true", confidence: 85, explanation: "Supported", proofs: [] },
      { claimIndex: 1, verdict: "false", confidence: 90, explanation: "Contradicted", proofs: [] },
    ]), 2);
    expect(parsed).toMatchObject([
      { verdict: "true", confidence: 85, explanation: "Supported" },
      { verdict: "false", confidence: 90, explanation: "Contradicted" },
    ]);
  });

  it("fills skipped or malformed batch entries safely", () => {
    expect(parseBatchEvaluation(JSON.stringify([{ verdict: "true", confidence: 85 }]), 2)[1].verdict).toBe("unverifiable");
    expect(parseBatchEvaluation("not json", 2)[0].verdict).toBe("unverifiable");
  });

  it("maps out-of-order JSON entries by claimIndex", () => {
    const parsed = parseBatchEvaluation(JSON.stringify([
      { claimIndex: 1, verdict: "false", confidence: 90, explanation: "Second", proofs: [] },
      { claimIndex: 0, verdict: "true", confidence: 85, explanation: "First", proofs: [] },
    ]), 2);
    expect(parsed[0].explanation).toBe("First");
    expect(parsed[1].explanation).toBe("Second");
  });

  it("parses JSON and prose cross-examinations", () => {
    const json = parseBatchCrossExamination(JSON.stringify([
      { stance: "agree", argument: "I agree", revisedVerdict: "same", revisedConfidence: 85 },
      { stance: "disagree", argument: "I disagree", revisedVerdict: "mostly_false", revisedConfidence: 80 },
    ]), [
      { verdict: "true", confidence: 85 },
      { verdict: "false", confidence: 90 },
    ]);
    expect(json[0].revisedVerdict).toBe("true");
    expect(json[1].revisedVerdict).toBe("mostly_false");

    const prose = parseCrossExamination(
      "I disagree because the strongest source contradicts it.\nRevised verdict: mostly_false\nRevised confidence: 80%",
      "true",
      60,
    );
    expect(prose).toMatchObject({ stance: "disagree", revisedVerdict: "mostly_false", revisedConfidence: 80 });
  });

  it("keeps prose evaluations instead of returning zero-confidence fallbacks", () => {
    const parsed = parseEvaluation("Unverifiable\nConfidence: 20%\nSupporting evidence: 3 sources were found.");
    expect(parsed).toMatchObject({ verdict: "unverifiable", confidence: 20 });
    expect(parsed.explanation).toContain("Supporting evidence");
  });

  it("maps prose batch responses to their claim slots", () => {
    const parsed = parseBatchEvaluation([
      "Claim 1: The first claim",
      "Verdict: mostly_true (75%)",
      "Confidence: 75%",
      "Reasoning: The evidence supports the general claim.",
      "Claim 2: The second claim",
      "Verdict: false",
      "Confidence: 90%",
      "Reasoning: The sources directly contradict it.",
    ].join("\n"), 2);
    expect(parsed[0]).toMatchObject({ verdict: "mostly_true", confidence: 75 });
    expect(parsed[1]).toMatchObject({ verdict: "false", confidence: 90 });
  });

  it("strips  thinking tags and parses the JSON array after them", () => {
    const raw = `<thinking>Let me analyze each claim carefully.</thinking>[{"claimIndex":0,"verdict":"true","confidence":90,"explanation":"Yes","proofs":[]},{"claimIndex":1,"verdict":"false","confidence":85,"explanation":"No","proofs":[]}]`;
    const parsed = parseBatchEvaluation(raw, 2);
    expect(parsed[0]).toMatchObject({ verdict: "true", confidence: 90 });
    expect(parsed[1]).toMatchObject({ verdict: "false", confidence: 85 });
  });

  it("strips  thinking tags and parses the JSON array after them", () => {
    const raw = `<think>Reasoning about claims.</think>[{"claimIndex":0,"verdict":"unverifiable","confidence":10,"explanation":"No evidence","proofs":[]}]`;
    const parsed = parseBatchEvaluation(raw, 1);
    expect(parsed[0]).toMatchObject({ verdict: "unverifiable", confidence: 10 });
  });

  it("prefers JSON arrays over JSON objects when both are present", () => {
    // Simulates a model that emits a JSON object in thinking text, then the actual array.
    const raw = `Here is my thinking: {"thought": "analyzing"}. Now the results: [{"claimIndex":0,"verdict":"true","confidence":85,"explanation":"Yes","proofs":[]}]`;
    const parsed = parseBatchEvaluation(raw, 1);
    expect(parsed[0]).toMatchObject({ verdict: "true", confidence: 85, explanation: "Yes" });
  });

  it("handles JSON wrapped in a wrapper object with alternative keys", () => {
    const raw = JSON.stringify({
      claims: [
        { claimIndex: 0, verdict: "true", confidence: 85, explanation: "Supported", proofs: [] },
        { claimIndex: 1, verdict: "false", confidence: 90, explanation: "Contradicted", proofs: [] },
      ],
    });
    const parsed = parseBatchEvaluation(raw, 2);
    expect(parsed[0]).toMatchObject({ verdict: "true", confidence: 85 });
    expect(parsed[1]).toMatchObject({ verdict: "false", confidence: 90 });
  });

  it("handles JSON wrapped in a 'verdicts' key", () => {
    const raw = JSON.stringify({
      verdicts: [
        { claimIndex: 0, verdict: "mixed", confidence: 50, explanation: "Mixed evidence", proofs: [] },
      ],
    });
    const parsed = parseBatchEvaluation(raw, 1);
    expect(parsed[0]).toMatchObject({ verdict: "mixed", confidence: 50 });
  });

  it("handles JSON wrapped in markdown fences with surrounding prose", () => {
    const raw = `Here are my evaluations:\n\`\`\`json\n[{"claimIndex":0,"verdict":"true","confidence":85,"explanation":"Yes","proofs":[]}]\n\`\`\`\nDone.`;
    const parsed = parseBatchEvaluation(raw, 1);
    expect(parsed[0]).toMatchObject({ verdict: "true", confidence: 85 });
  });
});

describe("extractJson", () => {
  it("strips thinking tags before extracting JSON", () => {
    const raw = `<thinking>some reasoning</thinking>[1,2,3]`;
    expect(JSON.parse(extractJson(raw))).toEqual([1, 2, 3]);
  });

  it("prefers arrays over objects", () => {
    const raw = `{"note": "thinking"} then [{"item": 1}]`;
    const result = JSON.parse(extractJson(raw));
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([{ item: 1 }]);
  });
});

describe("OpenAI-compatible reasoning stream", () => {
  it("forwards reasoning deltas while returning final answer content", async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"reasoning_content":"Checking the evidence. "}}]}\n'));
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"{\\"verdict\\":\\"true\\"}"}}]}\n'));
        controller.enqueue(encoder.encode("data: [DONE]\n"));
        controller.close();
      },
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status: 200 })));
    const chunks: string[] = [];
    const result = await streamChat({
      apiKey: "test-key",
      endpoint: "https://example.com/chat",
      model: "test-model",
      prompt: "test prompt",
      onToken: (chunk) => chunks.push(chunk),
    });

    expect(result).toBe('{"verdict":"true"}');
    expect(chunks.join("")).toContain("Checking the evidence.");
    expect(chunks.join("")).toContain('{"verdict":"true"}');
    vi.unstubAllGlobals();
  });

  it("retries on 503 server overload and succeeds on retry", async () => {
    let callCount = 0;
    const encoder = new TextEncoder();
    const successBody = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"hello"}}]}\n'));
        controller.enqueue(encoder.encode("data: [DONE]\n"));
        controller.close();
      },
    });
    vi.stubGlobal("fetch", vi.fn(async () => {
      callCount++;
      if (callCount === 1) return new Response("Service overloaded", { status: 503 });
      return new Response(successBody, { status: 200 });
    }));
    vi.stubGlobal("setTimeout", vi.fn((fn) => fn()) as unknown as typeof setTimeout);
    const result = await streamChat({
      apiKey: "test-key",
      endpoint: "https://example.com/chat",
      model: "test-model",
      prompt: "test prompt",
      onToken: () => {},
    });
    expect(result).toBe("hello");
    expect(callCount).toBe(2);
    vi.unstubAllGlobals();
  });

  it("callChat retries on 503 and succeeds on retry", async () => {
    let callCount = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      callCount++;
      if (callCount === 1) return new Response("Service overloaded", { status: 503 });
      return new Response(JSON.stringify({
        choices: [{ message: { content: "result" } }],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    vi.stubGlobal("setTimeout", vi.fn((fn) => fn()) as unknown as typeof setTimeout);
    const result = await callChat({
      apiKey: "test-key",
      endpoint: "https://example.com/chat",
      model: "test-model",
      prompt: "test prompt",
    });
    expect(result).toBe("result");
    expect(callCount).toBe(2);
    vi.unstubAllGlobals();
  });
});
