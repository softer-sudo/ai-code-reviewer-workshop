// STEP 3 — the deterministic gate. CODE decides the verdict, not the model.
import { buildLineIndex } from './grounding.ts';
import { dedupFindings } from './dedup.ts';
import type { UnifiedDiff } from './diff.ts';
import type { Finding } from './schema.ts';
import type { FailOn } from './agents.ts';

const RANK = { SUGGESTION: 1, WARNING: 2, CRITICAL: 3 } as const;
const MIN_RANK: Record<FailOn, number> = { never: Infinity, critical: 3, warning: 2, any: 1 };
const ICON = { CRITICAL: '🔴', WARNING: '🟡', SUGGESTION: '🔵' } as const;

export function countBlockers(findings: Finding[], failOn: FailOn): number {
  return findings.filter((f) => RANK[f.severity] >= MIN_RANK[failOn]).length;
}

export type ReviewEvent = 'COMMENT' | 'REQUEST_CHANGES';

export interface ReviewPayload {
  body: string;
  event: ReviewEvent;
  comments: { path: string; line: number; body: string }[];
}

export interface AgentOutcome {
  agent: string;
  failOn: FailOn;
  findings: Finding[];
  droppedCount: number;
  costUsd: number | null;
  model: string;
}

/** Merge every agent's grounded findings into ONE GitHub review. */
export function toReviewPayload(outcomes: AgentOutcome[], diff: UnifiedDiff): ReviewPayload {
  const index = buildLineIndex(diff);
  const blockers = outcomes.reduce((n, o) => n + countBlockers(o.findings, o.failOn), 0);
  const event: ReviewEvent = blockers > 0 ? 'REQUEST_CHANGES' : 'COMMENT';
  const merged = dedupFindings(outcomes.map((o) => ({ agent: o.agent, findings: o.findings })));

  const comments: ReviewPayload['comments'] = [];
  const lines: string[] = [];
  for (const f of merged) {
    const who = f.agents.join(', ');
    lines.push(`- ${ICON[f.severity]} **${f.title}** — \`${f.file}:${f.start_line}\` (${who})`);
    // GitHub can only anchor a comment on a line that is in the diff.
    const covered = index.get(f.file) ?? new Set<number>();
    const line = covered.has(f.end_line) ? f.end_line : f.start_line;
    if (covered.has(line)) {
      comments.push({
        path: f.file,
        line,
        body: `${ICON[f.severity]} **${f.title}** (${f.severity.toLowerCase()} · ${who})\n\n${f.rationale}${
          f.suggestion ? `\n\n**Suggestion:** ${f.suggestion}` : ''
        }`,
      });
    }
  }
  const header =
    event === 'REQUEST_CHANGES'
      ? `## AI Review — ${blockers} blocker(s), changes requested`
      : `## AI Review — no blockers`;
  const perAgent = outcomes.map((o) => `${o.agent}: ${o.findings.length} (dropped ${o.droppedCount}, ${o.model})`).join(' · ');
  const footer = '_The gate is computed from severities, not from the model verdict. A human merges._';
  return { body: [header, perAgent, ...lines, footer].join('\n\n'), event, comments };
}
