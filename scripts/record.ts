// MAINTAINER SCRIPT — `npm run record`. Records everything mock mode (`npm run review:mock`) replays:
//   1. PR snapshot   fixtures/quick-blog/pr.json, diff.patch and repo/ (text files of the repo at the PR head)
//   2. model answers fixtures/quick-blog/answers/<agent>.<ctx|noctx>.json, one real model call per agent and variant
// Needs OPENROUTER_API_KEY for step 2 only. Run it on the `final` branch (it needs all four steps).
//   npm run record                     PR from REVIEW_PR
//   npm run record -- --pr o/r#N       another PR
//   npm run record -- --snapshot-only  only step 1 (no key needed)
//   npm run record -- --answers-only   only step 2 (reuse the snapshot)
import '../src/env.ts';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { parseArgs } from 'node:util';
import { loadAgents } from '../src/agents.ts';
import { gatherContext } from '../src/context.ts';
import { fetchPr, parsePrRef } from '../src/github.ts';
import { answerPath, type Variant } from '../src/llm.ts';
import { loadSnapshot } from '../src/pr.ts';
import { reviewWithAgent } from '../src/review.ts';
import { DirSource } from '../src/source.ts';

const { values } = parseArgs({
  options: { pr: { type: 'string' }, 'snapshot-only': { type: 'boolean' }, 'answers-only': { type: 'boolean' } },
});
const DIR = 'fixtures/quick-blog';
const TEXT = /\.(?:[cm]?[jt]sx?|json|md|ya?ml)$/;
const SKIP = /(?:^|\/)(?:node_modules|\.git|dist|build|coverage)\/|package-lock\.json$|(?:^|\/)\./;
const MAX_FILE = 100_000;
const MAX_TOTAL = 3_000_000;
const token = process.env.GITHUB_TOKEN ?? '';

async function snapshot() {
  const spec = values.pr ?? process.env.REVIEW_PR;
  if (!spec) throw new Error('Pass --pr owner/repo#N or set REVIEW_PR in .env');
  const ref = parsePrRef(spec);
  console.log(`Snapshot of ${spec} …`);
  const pr = await fetchPr(ref, token);

  rmSync(`${DIR}/repo`, { recursive: true, force: true });
  mkdirSync(`${DIR}/repo`, { recursive: true });
  writeFileSync(`${DIR}/pr.json`, `${JSON.stringify({ ...ref, title: pr.title, body: pr.body, headSha: pr.headSha }, null, 2)}\n`);
  writeFileSync(`${DIR}/diff.patch`, pr.diff);

  // One request for the whole tree at the PR head commit (tarball), then keep only small text files.
  const tmp = mkdtempSync(join(tmpdir(), 'record-'));
  const res = await fetch(`https://api.github.com/repos/${ref.owner}/${ref.repo}/tarball/${pr.headSha}`, {
    headers: { 'User-Agent': 'ai-code-reviewer-workshop', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new Error(`Tarball download failed: ${res.status}`);
  writeFileSync(join(tmp, 'repo.tgz'), Buffer.from(await res.arrayBuffer()));
  execFileSync('tar', ['-xzf', join(tmp, 'repo.tgz'), '-C', tmp, '--strip-components=1', '--exclude=repo.tgz']);

  let total = 0;
  let count = 0;
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      const rel = relative(tmp, full);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && rel !== 'repo.tgz' && TEXT.test(rel) && !SKIP.test(rel) && statSync(full).size <= MAX_FILE) {
        if (total + statSync(full).size > MAX_TOTAL) continue;
        total += statSync(full).size;
        count++;
        mkdirSync(join(`${DIR}/repo`, rel, '..'), { recursive: true });
        cpSync(full, join(`${DIR}/repo`, rel));
      }
    }
  };
  walk(tmp);
  rmSync(tmp, { recursive: true, force: true });
  console.log(`  ${pr.diff.length.toLocaleString('en-US')} chars of diff, ${count} files (${Math.round(total / 1000)} kB) at ${pr.headSha.slice(0, 7)}`);
}

async function answers() {
  delete process.env.REVIEW_MOCK; // record always talks to the real model
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not set (put it in .env).');
  if (!existsSync(`${DIR}/pr.json`)) throw new Error('No snapshot yet. Run without --answers-only first.');
  const { ref, pr } = loadSnapshot(DIR);
  const agents = loadAgents();
  const source = new DirSource(`${DIR}/repo`);
  const ctx = await gatherContext(source, {
    rawDiff: pr.diff,
    prBody: pr.body,
    extraDocs: agents.flatMap((a) => (a.specPath ? [a.specPath] : [])),
  });
  console.log(`Recording ${agents.length} agent(s) × 2 variants for ${ref.owner}/${ref.repo}#${ref.number}\n${ctx.log.join('\n')}`);
  const base = { rawDiff: pr.diff, prTitle: pr.title, prBody: pr.body };
  for (const variant of ['ctx', 'noctx'] as Variant[]) {
    const input = { ...base, context: variant === 'ctx' ? ctx.blocks : undefined };
    const done = await Promise.all(agents.map((a) => reviewWithAgent(a, input)));
    done.forEach(({ llm }, i) => {
      const file = answerPath(agents[i].id, variant, DIR);
      mkdirSync(`${DIR}/answers`, { recursive: true });
      writeFileSync(file, `${JSON.stringify({ ...llm, recordedAt: new Date().toISOString() }, null, 2)}\n`);
      console.log(`  ${file}  ${llm.review.findings.length} findings · ${llm.tokensIn} in / ${llm.tokensOut} out · $${(llm.costUsd ?? 0).toFixed(4)}`);
    });
  }
}

try {
  if (!values['answers-only']) await snapshot();
  if (!values['snapshot-only']) await answers();
} catch (e) {
  console.error(`\x1b[31mrecord failed:\x1b[0m ${(e as Error).message}`);
  process.exitCode = 1;
}
