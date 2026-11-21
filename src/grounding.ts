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
  const index = buildLineIndex(diff);
  const kept: Finding[] = [];
  const dropped: Dropped[] = [];

  for (const f of findings) {
    const lines = index.get(f.file);
    if (!lines) {
      dropped.push({ finding: f, reason: `file '${f.file}' is not in the diff` });
      continue;
    }
    const lo = Math.min(f.start_line, f.end_line);
    const hi = Math.max(f.start_line, f.end_line);
    let hit = false;
    for (let n = lo; n <= hi && !hit; n++) hit = lines.has(n);
    if (hit) kept.push(f);
    else dropped.push({ finding: f, reason: `lines ${lo}-${hi} do not touch any hunk in '${f.file}'` });
  }
  return { kept, dropped };
}
