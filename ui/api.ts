// READY — the JSON API behind the local UI. Validation is a pure function (tested); the handler calls runReview().
import { loadAgents } from '../src/agents.ts';
import { runReview, type RunOptions, type RunResult } from '../src/run.ts';

export interface UiRequest extends RunOptions {
  mock: boolean;
}

const PR = /^[\w.-]+\/[\w.-]+#\d+$/;

/** Only these fields ever reach runReview(): no repoDir, no ci, no dryRun from the browser. */
export function parseRequest(body: unknown): { ok: true; req: UiRequest } | { ok: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'body must be a JSON object' };
  const b = body as Record<string, unknown>;
  const bool = (k: string) => b[k] === undefined || typeof b[k] === 'boolean';
  if (!bool('noContext') || !bool('mock')) return { ok: false, error: 'noContext and mock must be booleans' };
  if (b.pr !== undefined && (typeof b.pr !== 'string' || !PR.test(b.pr))) return { ok: false, error: 'pr must look like owner/repo#123' };
  if (b.model !== undefined && (typeof b.model !== 'string' || !/^[\w./:@-]{0,100}$/.test(b.model))) return { ok: false, error: 'bad model id' };
  const agents = b.agents;
  if (agents !== undefined && (!Array.isArray(agents) || !agents.length || !agents.every((a) => typeof a === 'string' && /^[\w-]+$/.test(a)))) {
    return { ok: false, error: 'agents must be a non-empty list of agent ids' };
  }
  return {
    ok: true,
    req: {
      pr: (b.pr as string | undefined) || undefined,
      agents: agents as string[] | undefined,
      model: (b.model as string | undefined) || undefined,
      noContext: b.noContext === true,
      mock: b.mock === true,
    },
  };
}

export function config() {
  return {
    pr: process.env.REVIEW_PR ?? '',
    agents: loadAgents('.reviewer/agents', '', '').map((a) => ({ id: a.id, name: a.name, model: a.model })),
  };
}

// One review at a time: mock mode is a process-wide env switch.
let queue: Promise<unknown> = Promise.resolve();

export function review(req: UiRequest): Promise<Omit<RunResult, 'rawDiff' | 'outcomes'>> {
  const run = queue.then(async () => {
    const before = process.env.REVIEW_MOCK;
    if (req.mock) process.env.REVIEW_MOCK = '1';
    else delete process.env.REVIEW_MOCK;
    try {
      const { rawDiff: _raw, outcomes: _out, ...result } = await runReview(req);
      return result;
    } finally {
      if (before === undefined) delete process.env.REVIEW_MOCK;
      else process.env.REVIEW_MOCK = before;
    }
  });
  queue = run.catch(() => undefined);
  return run;
}
