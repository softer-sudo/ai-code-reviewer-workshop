// READY — one function that answers "which PR, and where do its files come from?".
//   CI           PR from GITHUB_REPOSITORY + PR_NUMBER; files from --repo-dir (the checkout)
//   REVIEW_MOCK  recorded snapshot in fixtures/quick-blog/ (offline)
//   otherwise    --pr owner/repo#N (default: REVIEW_PR) via the GitHub API
import { existsSync, readFileSync } from 'node:fs';
import { fetchPr, parsePrRef, type PrData, type PrRef } from './github.ts';
import { DirSource, GitHubSource, type RepoSource } from './source.ts';

export interface Target {
  ref: PrRef;
  pr: PrData;
  source: RepoSource;
}

export const FIXTURE_DIR = process.env.REVIEW_FIXTURES ?? 'fixtures/quick-blog';

export function loadSnapshot(dir = FIXTURE_DIR): { ref: PrRef; pr: PrData } {
  const meta = `${dir}/pr.json`;
  if (!existsSync(meta)) throw new Error(`No PR snapshot in ${dir}. Run "npm run record" first.`);
  const j = JSON.parse(readFileSync(meta, 'utf8')) as PrData & PrRef;
  return {
    ref: { owner: j.owner, repo: j.repo, number: j.number },
    pr: { title: j.title, body: j.body, headSha: j.headSha, diff: readFileSync(`${dir}/diff.patch`, 'utf8') },
  };
}

export async function loadTarget(opts: { ci?: boolean; pr?: string; repoDir?: string }): Promise<Target> {
  const token = process.env.GITHUB_TOKEN ?? '';
  const sourceFor = (ref: PrRef, sha: string): RepoSource =>
    opts.repoDir ? new DirSource(opts.repoDir) : new GitHubSource(ref.owner, ref.repo, sha, token);

  if (opts.ci) {
    const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? '').split('/');
    const ref = { owner, repo, number: Number(process.env.PR_NUMBER) };
    if (!owner || !ref.number || !token) throw new Error('CI mode needs GITHUB_REPOSITORY, PR_NUMBER and GITHUB_TOKEN');
    const pr = await fetchPr(ref, token);
    return { ref, pr, source: sourceFor(ref, pr.headSha) };
  }
  if (process.env.REVIEW_MOCK === '1') {
    const { ref, pr } = loadSnapshot();
    const wanted = opts.pr ?? process.env.REVIEW_PR;
    if (wanted && parsePrRef(wanted).number !== ref.number) {
      console.warn(`note: mock mode replays the recorded PR #${ref.number}, not ${wanted}`);
    }
    return { ref, pr, source: new DirSource(opts.repoDir ?? `${FIXTURE_DIR}/repo`) };
  }
  const spec = opts.pr ?? process.env.REVIEW_PR;
  if (!spec) throw new Error('No PR given. Pass --pr owner/repo#N or set REVIEW_PR in .env');
  const ref = parsePrRef(spec);
  const pr = await fetchPr(ref, token);
  return { ref, pr, source: sourceFor(ref, pr.headSha) };
}
