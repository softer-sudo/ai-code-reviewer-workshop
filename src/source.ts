// READY — where repository files come from. One interface, two implementations:
//   DirSource    a local directory (CI checkout with --repo-dir, or the recorded fixture)
//   GitHubSource the GitHub REST API at one commit (local runs with --pr owner/repo#N)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export interface RepoSource {
  label: string;
  /** How many files the "callers" search may read. The API costs one request per file. */
  scanLimit: number;
  /** Repo-relative paths with forward slashes. */
  list(): Promise<string[]>;
  /** File text, or undefined when the file does not exist or is too large / binary. */
  read(path: string): Promise<string | undefined>;
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.cache']);
const MAX_FILE_BYTES = 200_000;

export class DirSource implements RepoSource {
  scanLimit = Infinity;
  label: string;
  constructor(private root: string) {
    this.label = `directory ${root}`;
  }

  async list(): Promise<string[]> {
    const out: string[] = [];
    const walk = (rel: string) => {
      for (const e of readdirSync(join(this.root, rel), { withFileTypes: true })) {
        const p = rel ? `${rel}/${e.name}` : e.name;
        if (e.isDirectory()) {
          if (!SKIP_DIRS.has(e.name)) walk(p);
        } else if (e.isFile()) out.push(p);
      }
    };
    walk('');
    return out.sort();
  }

  async read(path: string): Promise<string | undefined> {
    try {
      const full = join(this.root, path);
      if (statSync(full).size > MAX_FILE_BYTES) return undefined;
      const text = readFileSync(full, 'utf8');
      return text.includes('\0') ? undefined : text;
    } catch {
      return undefined;
    }
  }
}

export class GitHubSource implements RepoSource {
  scanLimit = 30;
  label: string;
  constructor(
    private owner: string,
    private repo: string,
    private sha: string,
    private token = '',
  ) {
    this.label = `GitHub ${owner}/${repo}@${sha.slice(0, 7)}${token ? '' : ' (no token)'}`;
  }

  private headers(accept: string): Record<string, string> {
    const h: Record<string, string> = { Accept: accept, 'User-Agent': 'ai-code-reviewer-workshop' };
    if (this.token) h.Authorization = `Bearer ${this.token}`;
    return h;
  }

  async list(): Promise<string[]> {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/git/trees/${this.sha}?recursive=1`;
    const res = await fetch(url, { headers: this.headers('application/vnd.github+json') });
    if (!res.ok) throw new Error(`GitHub API ${res.status} listing ${this.owner}/${this.repo}@${this.sha}`);
    const body = (await res.json()) as { tree: { path: string; type: string; size?: number }[] };
    return body.tree.filter((t) => t.type === 'blob' && (t.size ?? 0) <= MAX_FILE_BYTES).map((t) => t.path);
  }

  async read(path: string): Promise<string | undefined> {
    // With a token: the contents API (5000 requests/hour).
    // Without: raw.githubusercontent.com, so 40 people on one Wi-Fi do not burn the 60/hour API limit.
    const url = this.token
      ? `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${encodeURI(path)}?ref=${this.sha}`
      : `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.sha}/${encodeURI(path)}`;
    const res = await fetch(url, { headers: this.headers('application/vnd.github.raw+json') });
    if (!res.ok) return undefined;
    const text = await res.text();
    return text.includes('\0') ? undefined : text;
  }
}
