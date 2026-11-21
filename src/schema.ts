// STEP 1 — the contract between the model and your code.
// The JSON schema lives HERE, not in the prompt. The API enforces it (response_format: json_schema).
import { z } from 'zod';

export const Severity = z.enum(['CRITICAL', 'WARNING', 'SUGGESTION']);
export type Severity = z.infer<typeof Severity>;

export const FindingSchema = z.object({
  file: z.string().describe('Repo-relative path exactly as it appears in the diff'),
  start_line: z.number().int().describe('First NEW-side line number the finding is about'),
  end_line: z.number().int().describe('Last NEW-side line number (same as start_line for one line)'),
  // TODO(step 1): add the fields the rest of the pipeline needs:
  //   severity   → Severity                  (the gate in step 3 counts on it)
  //   category   → enum: security | correctness | performance | spec | maintainability
  //   title      → one short sentence
  //   rationale  → why it is a problem, citing the code
  //   suggestion → concrete fix, '' if none
  // Tip: .describe() text is sent to the model as part of the schema.
});
export type Finding = z.infer<typeof FindingSchema> & {
  // Remove this block once the fields above exist.
  severity: Severity;
  category: string;
  title: string;
  rationale: string;
  suggestion: string;
};

export const ReviewSchema = z.object({
  summary: z.string(),
  findings: z.array(FindingSchema),
  // The model may "vote", but the gate in step 3 ignores this field on purpose.
  verdict: z.enum(['approve', 'comment', 'request_changes']),
});
export type Review = { summary: string; findings: Finding[]; verdict: string };
