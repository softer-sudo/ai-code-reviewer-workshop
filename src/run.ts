// READY — the whole review as ONE function. The CLI (src/index.ts) and the local UI (ui/) both call it.
// It returns data and prints nothing, so every door can render it its own way.
import { loadAgents } from './agents.ts';
import { gatherContext, type Context } from './context.ts';
import { dedupFindings, type MergedFinding } from './dedup.ts';
import { countBlockers, type AgentOutcome } from './gate.ts';
import { loadTarget } from './pr.ts';
import { promptFor, reviewWithAgent, type ReviewInput } from './review.ts';
import type { Finding } from './schema.ts';

export interface RunOptions {
  ci?: boolean;
  pr?: string;
  repoDir?: string;
  noContext?: boolean;
  dryRun?: boolean;
  /** Agent ids; default all. */
  agents?: string[];
  /** Overrides the model of every agent. */
  model?: string;
}

export interface AgentRun {
  id: string;
  name: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  ms: number;
  findings: Finding[];
  dropped: { title: string; file: string; reason: string }[];
}

export interface RunResult {
  pr: { owner: string; repo: string; number: number; title: string };
  sourceLabel: string;
  contextLog: string[];
  agents: AgentRun[];
  merged: MergedFinding[];
  blockers: number;
  gate: 'PASS' | 'FAIL';
  totals: { tokensIn: number; tokensOut: number; costUsd: number };
  /** Dry run only: prompt size per agent. */
  promptSizes: { agent: string; chars: number; model: string }[];
  /** "not implemented yet (step N)" hints, so a half-finished branch shows a result instead of crashing. */
  notes: string[];
  outcomes: AgentOutcome[];
  rawDiff: string;
}

const RANK = { SUGGESTION: 1, WARNING: 2, CRITICAL: 3 } as const;

export async function runReview(opts: RunOptions): Promise<RunResult> {
  const { ref, pr, source } = await loadTarget({ ci: opts.ci, pr: opts.pr, repoDir: opts.repoDir });
  const notes: string[] = [];
  const agents = loadAgents('.reviewer/agents', opts.agents?.join(','), opts.model);
  if (!agents.length) throw new Error('No agents selected. Check .reviewer/agents/ and the AGENTS filter.');

  let context: Context | null = null;
  let contextLog: string[] = [];
  if (!opts.noContext) {
    context = await gatherContext(source, {
      rawDiff: pr.diff,
      prBody: pr.body,
      extraDocs: agents.flatMap((a) => (a.specPath ? [a.specPath] : [])),
    });
    contextLog = [`Context from ${source.label}:`, ...context.log];
    if (context.log.some((l) => l.includes('not implemented yet'))) notes.push('Repository context: not implemented yet (step 2)');
  }
  const input: ReviewInput = { rawDiff: pr.diff, prTitle: pr.title, prBody: pr.body, context: context?.blocks };
  const base = {
    pr: { ...ref, title: pr.title },
    sourceLabel: source.label,
    contextLog,
    rawDiff: pr.diff,
    notes,
  };

  if (opts.dryRun) {
    const promptSizes = agents.map((a) => {
      const [sys, user] = promptFor(a, input);
      return { agent: a.id, chars: sys.content.length + user.content.length, model: a.model };
    });
    return { ...base, agents: [], merged: [], blockers: 0, gate: 'PASS', totals: { tokensIn: 0, tokensOut: 0, costUsd: 0 }, promptSizes, outcomes: [] };
  }

  // Agents are independent, so they run in parallel.
  const results = await Promise.all(agents.map((a) => reviewWithAgent(a, input)));
  const runs: AgentRun[] = results.map(({ outcome, dropped, llm }, i) => ({
    id: agents[i].id,
    name: outcome.agent,
    model: llm.model,
    tokensIn: llm.tokensIn,
    tokensOut: llm.tokensOut,
    costUsd: llm.costUsd ?? 0,
    ms: llm.ms,
    findings: outcome.findings,
    dropped: dropped.map((d) => ({ title: d.finding.title, file: d.finding.file, reason: d.reason })),
  }));
  const outcomes = results.map((r) => r.outcome);
  const perAgent = outcomes.map((o) => ({ agent: o.agent, findings: o.findings }));
  const merged = dedupFindings(perAgent);
  const blockers = outcomes.reduce((n, o) => n + countBlockers(o.findings, o.failOn), 0);

  // Half-finished branches: say what is missing instead of showing silently wrong numbers.
  const probe = { file: 'a', start_line: 1, end_line: 1, severity: 'WARNING' as const, category: 'correctness' as const, title: 'same problem', rationale: '', suggestion: '' };
  if (agents.length > 1 && dedupFindings([{ agent: 'x', findings: [probe] }, { agent: 'y', findings: [probe] }]).length === 2) {
    notes.push('Dedup: not implemented yet (step 4)');
  }
  const wouldBlock = outcomes.some((o) => o.findings.some((f) => f.severity && RANK[f.severity] >= ({ never: 9, critical: 3, warning: 2, any: 1 }[o.failOn] ?? 3)));
  if (wouldBlock && blockers === 0) notes.push('Gate: countBlockers() returns 0 although blocking findings exist (step 3)');
  if (runs.some((r) => r.findings.some((f) => !f.severity))) notes.push('Findings have no severity yet (step 1: schema)');

  return {
    ...base,
    agents: runs,
    merged,
    blockers,
    gate: blockers > 0 ? 'FAIL' : 'PASS',
    totals: {
      tokensIn: runs.reduce((n, r) => n + r.tokensIn, 0),
      tokensOut: runs.reduce((n, r) => n + r.tokensOut, 0),
      costUsd: runs.reduce((n, r) => n + r.costUsd, 0),
    },
    promptSizes: [],
    outcomes,
  };
}
