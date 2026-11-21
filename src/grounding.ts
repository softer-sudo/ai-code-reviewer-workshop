// STEP 1 — the grounding gate.
// A finding survives ONLY if its file is in the diff and its line range touches a real hunk.
// Everything else is a hallucinated location, so we drop it and say why.
import type { UnifiedDiff } from './diff.ts';
import type { Finding } from './schema.ts';

export interface Dropped {
  finding: Finding;
  reason: string;
}

/** file path → set of NEW-side line numbers covered by the diff */
export function buildLineIndex(diff: UnifiedDiff): Map<string, Set<number>> {
  const index = new Map<string, Set<number>>();
  for (const file of diff.files) {
    const lines = new Set<number>();
    for (const hunk of file.hunks) for (const n of hunk.newLineNumbers) lines.add(n);
    index.set(file.path, lines);
  }
  return index;
}

export function groundFindings(findings: Finding[], diff: UnifiedDiff): { kept: Finding[]; dropped: Dropped[] } {
  // TODO(step 1): make `npm test` green.
  //   1. const index = buildLineIndex(diff)
  //   2. file not in index            → dropped, reason: `file '<path>' is not in the diff`
  //   3. no line in [lo..hi] in index  → dropped, reason: `lines <lo>-<hi> do not touch any hunk in '<path>'`
  //      (lo/hi = min/max of start_line and end_line: models sometimes swap them)
  //   4. otherwise                     → kept
  void diff;
  return { kept: findings, dropped: [] };
}
