export interface SourceDetail {
  url: string;
  title?: string;
  snippet?: string;
  sourceType: string;
  reliability: number;
  perspective: "supporting" | "contradicting" | "contextual";
  publishedDate?: string;
}

export interface ModelEvaluation {
  model: string;
  verdict?: string;
  confidence?: number;
  reasoning?: string;
  status: "thinking" | "done" | "failed";
  /** Live thinking text as it streams from the model. */
  thinking?: string;
}

/** A model's response after seeing other models' evaluations (cross-examination round). */
export interface CrossExamination {
  model: string;
  /** Whether the model agrees, disagrees, or partially agrees with the consensus. */
  stance: "agree" | "disagree" | "partial";
  /** Which model(s) the model is responding to. */
  respondingTo?: string;
  /** The model's argument or concession. */
  argument: string;
  /** Revised verdict if the model changed its mind, otherwise same as original. */
  revisedVerdict?: string;
  revisedConfidence?: number;
  status: "thinking" | "done" | "failed";
  thinking?: string;
}

// --- Progress events for the showcase pipeline visualization ---

export type ProgressEvent =
  | {
      step: "input";
      status: "started" | "done";
      detail?: string;
      inputType?: string;
      rawInput?: string;
      preview?: string;
      metadata?: Record<string, string>;
    }
  | { step: "transcript"; status: "started" | "done"; method?: string; detail?: string; preview?: string }
  | { step: "extract-claims"; status: "started" | "done" | "failed"; model?: string; detail?: string; claims?: string[] }
  | { step: "analyze-media"; status: "started" | "done"; model?: string; detail?: string }
  | {
      step: "gather-evidence";
      status: "started" | "done";
      claim?: string;
      sources?: number;
      sourceList?: SourceDetail[];
      searchQueries?: string[];
    }
  | {
      step: "ensemble";
      status: "started" | "done";
      claim?: string;
      models?: string[];
      evaluations?: ModelEvaluation[];
    }
  | {
      step: "thinking";
      status: "started";
      claim?: string;
      model?: string;
      /** The text chunk that was just generated. */
      chunk?: string;
      /** Full accumulated thinking text so far. */
      fullText?: string;
    }
  | {
      step: "cross-examine";
      status: "started" | "done";
      claim?: string;
      /** Which round of cross-examination (1, 2, etc.) */
      round?: number;
      /** Which model is currently thinking. */
      activeModel?: string;
      /** All cross-examination responses so far. */
      examinations?: CrossExamination[];
    }
  | {
      step: "judge";
      status: "started" | "done";
      claim?: string;
      model?: string;
      verdict?: string;
      confidence?: number;
      thinking?: string;
      reasoning?: string;
      deliberation?: string;
    }
  | {
      step: "synthesize";
      status: "started" | "done";
      model?: string;
      detail?: string;
      verdict?: string;
      confidence?: number;
      summary?: string;
    }
  | { step: "complete"; status: "done"; verdict?: string; confidence?: number };

export type ProgressCallback = (event: ProgressEvent) => void;

