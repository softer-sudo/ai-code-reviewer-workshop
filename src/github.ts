// READY — tiny GitHub REST client on global fetch. No octokit.
import type { ReviewPayload } from './gate.ts';

const API = 'https://api.github.com';

export interface PrRef {
  owner: string;
  repo: string;
  number: number;
}

/** "owner/repo#34" → { owner, repo, number } */
export function parsePrRef(s: string): PrRef {
  const m = /^([\w.-]+)\/([\w.-]+)#(\d+)$/.exec(s.trim());
  if (!m) throw new Error(`Bad PR reference '${s}'. Expected owner/repo#number, e.g. burnjohn/quick-blog#34`);
  return { owner: m[1], repo: m[2], number: Number(m[3]) };
}

export interface PrData {
  title: string;
  body: string;
  diff: string;
  headSha: string;
}

function headers(token: string, accept: string): Record<string, string> {
  const h: Record<string, string> = {
    Accept: accept,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'ai-code-reviewer-workshop',
  };
  if (token) h.Authorization = `Bearer ${token}`; // public repos work without a token (60 requests/hour)
  return h;
}

export async function fetchPr(pr: PrRef, token = ''): Promise<PrData> {
  const url = `${API}/repos/${pr.owner}/${pr.repo}/pulls/${pr.number}`;
  const [meta, diff] = await Promise.all([
    fetch(url, { headers: headers(token, 'application/vnd.github+json') }),
    fetch(url, { headers: headers(token, 'application/vnd.github.v3.diff') }),
  ]);
  if (!meta.ok || !diff.ok) {
    const hint = meta.status === 403 || meta.status === 429 ? ' (rate limit? set GITHUB_TOKEN in .env)' : '';
    throw new Error(`GitHub API error fetching ${pr.owner}/${pr.repo}#${pr.number}: ${meta.status}/${diff.status}${hint}`);
  }
  const m = (await meta.json()) as { title: string; body: string | null; head: { sha: string } };
  return { title: m.title, body: m.body ?? '', diff: await diff.text(), headSha: m.head.sha };
}

export async function postReview(pr: PrRef, token: string, payload: ReviewPayload) {
  const url = `${API}/repos/${pr.owner}/${pr.repo}/pulls/${pr.number}/reviews`;
  const post = (b: object) =>
    fetch(url, {
      method: 'POST',
      headers: { ...headers(token, 'application/vnd.github+json'), 'Content-Type': 'application/json' },
      body: JSON.stringify(b),
    });
  let res = await post(payload);
  // One unresolvable inline comment makes GitHub reject the whole review → fall back to body only.
  if (res.status === 422 && payload.comments.length) res = await post({ body: payload.body, event: payload.event });
  if (!res.ok) throw new Error(`GitHub API error posting review: ${res.status} ${await res.text()}`);
}
