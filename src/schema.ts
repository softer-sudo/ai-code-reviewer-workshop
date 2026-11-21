// STEP 1 — the contract between the model and your code.
// The JSON schema lives HERE, not in the prompt. The API enforces it (response_format: json_schema).
import { z } from 'zod';

export const Severity = z.enum(['CRITICAL', 'WARNING', 'SUGGESTION']);
export type Severity = z.infer<typeof Severity>;

export const FindingSchema = z.object({
  file: z.string().describe('Repo-relative path exactly as it appears in the diff'),
  start_line: z.number().int().describe('First NEW-side line number the finding is about'),
  end_line: z.number().int().describe('Last NEW-side line number (same as start_line for one line)'),
  severity: Severity,
  category: z.enum(['security', 'correctness', 'performance', 'spec', 'maintainability']),
  title: z.string().describe('One short sentence, no file names'),
  rationale: z.string().describe('Why this is a problem, citing the code'),
  suggestion: z.string().describe('Concrete fix; empty string if none'),
});
export type Finding = z.infer<typeof FindingSchema>;

export const ReviewSchema = z.object({
  summary: z.string(),
  findings: z.array(FindingSchema),
  // The model may "vote", but the gate in step 3 ignores this field on purpose.
  verdict: z.enum(['approve', 'comment', 'request_changes']),
});
export type Review = z.infer<typeof ReviewSchema>;
