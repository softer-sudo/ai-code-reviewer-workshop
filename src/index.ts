// Entry point (the CLI door). The review itself is runReview() in src/run.ts; the local UI calls the same function.
//   npm run review        real model, PR from REVIEW_PR (.env)
//   npm run review:mock   offline, recorded PR + recorded answers
//   --pr owner/repo#N     which PR (default: REVIEW_PR)      --repo-dir <dir>   read files from a checkout
//   --no-context          diff only, no repository context   --dry-run          print prompt sizes, call no model
//   --ci                  GitHub Action mode: reads GITHUB_REPOSITORY, PR_NUMBER, GITHUB_TOKEN and POSTS the review
import './env.ts';
import { parseArgs } from 'node:util';
import { toReviewPayload } from './gate.ts';
import { postReview } from './github.ts';
import { parseUnifiedDiff } from './diff.ts';
import { runReview } from './run.ts';

const { values } = parseArgs({
  options: {
    ci: { type: 'boolean' },
    pr: { type: 'string' },
    'repo-dir': { type: 'string' },
    'no-context': { type: 'boolean' },
    'dry-run': { type: 'boolean' },
    verbose: { type: 'boolean', short: 'v' },
  },
});

const C = { dim: '\x1b[2m', red: '\x1b[31m', yel: '\x1b[33m', blu: '\x1b[34m', grn: '\x1b[32m', off: '\x1b[0m' };
const SEV = {
  CRITICAL: `${C.red}CRITICAL${C.off}`,
  WARNING: `${C.yel}WARNING ${C.off}`,
  SUGGESTION: `${C.blu}SUGGEST ${C.off}`,
};
const n = (x: number) => x.toLocaleString('en-US');

async function main() {
  const r = await runReview({
    ci: values.ci,
    pr: values.pr,
    repoDir: values['repo-dir'],
    noContext: values['no-context'],
    dryRun: values['dry-run'],
  });
  console.log(`${C.dim}PR ${r.pr.owner}/${r.pr.repo}#${r.pr.number} · ${r.pr.title}${C.off}`);
  console.log(values['no-context'] ? `${C.dim}Context: off (--no-context)${C.off}` : r.contextLog.map((l) => `${C.dim}${l}${C.off}`).join('\n'));
  for (const note of r.notes) console.log(`${C.yel}note: ${note}${C.off}`);

  if (values['dry-run']) {
    console.log('\nPrompt sizes (no model is called):');
    for (const p of r.promptSizes) {
      console.log(`  ${p.agent.padEnd(18)} ${n(p.chars)} chars ≈ ${n(Math.round(p.chars / 4))} tokens → ${p.model}`);
    }
    return;
  }

  console.log(`\n${C.dim}Reviewed with ${r.agents.length} agent(s): ${r.agents.map((a) => `${a.id} → ${a.model}`).join(', ')}${C.off}\n`);
  for (const a of r.agents) {
    console.log(`■ ${a.name}  ${C.dim}${a.model} · ${n(a.tokensIn)} in / ${n(a.tokensOut)} out · $${a.costUsd.toFixed(5)} · ${a.ms} ms${C.off}`);
    for (const f of a.findings) console.log(`  ${SEV[f.severity]}  ${f.file}:${f.start_line}  ${f.title}`);
    for (const d of a.dropped) console.log(`  ${C.dim}DROPPED   ${d.title} — ${d.reason}${C.off}`);
    console.log();
  }
  console.log(`Findings per agent: ${r.agents.map((a) => `${a.name} ${a.findings.length}`).join(' · ')} → ${r.merged.length} after dedup`);
  console.log(`Total: ${n(r.totals.tokensIn)} in / ${n(r.totals.tokensOut)} out tokens · $${r.totals.costUsd.toFixed(5)} · blockers: ${r.blockers}`);

  if (values.ci) {
    const payload = toReviewPayload(r.outcomes, parseUnifiedDiff(r.rawDiff));
    await postReview(r.pr, process.env.GITHUB_TOKEN ?? '', payload);
    console.log(`Posted ${payload.event} with ${payload.comments.length} inline comment(s).`);
  }
  if (r.gate === 'FAIL') {
    console.log(`${C.red}Gate: FAIL${C.off} (the model's own verdict is ignored)`);
    process.exitCode = 1;
  } else {
    console.log(`${C.grn}Gate: PASS${C.off}`);
  }
}

// Hard fail: any error → exit 1 and post nothing. A silent green check is worse than a red one.
main().catch((e) => {
  console.error(`\x1b[31mReview failed:\x1b[0m ${(e as Error).message}`);
  process.exitCode = 1;
});
