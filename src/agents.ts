// STEP 4 — agents are Markdown files: frontmatter = settings, body = system prompt.
// Drop a new file into .reviewer/agents/ and the runner picks it up. No code changes.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type FailOn = 'never' | 'critical' | 'warning' | 'any';

export interface Agent {
  id: string;
  name: string;
  model: string;
  failOn: FailOn;
  /** Step 4b: path to a spec file that goes into the prompt. */
  specPath?: string;
  prompt: string;
}

export const DEFAULT_MODEL = 'deepseek/deepseek-v4.1-flash';

function parseFrontmatter(src: string): { meta: Record<string, string>; body: string } {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(src);
  if (!m) return { meta: {}, body: src };
  const meta: Record<string, string> = {};
  for (const line of m[1].split('\n')) {
    const kv = /^([\w-]+):\s*(.*)$/.exec(line.trim());
    if (kv) meta[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
  }
  return { meta, body: m[2].trim() };
}

export function loadAgents(dir = '.reviewer/agents', only = process.env.AGENTS, model = process.env.REVIEW_MODEL): Agent[] {
  const wanted = only ? new Set(only.split(',').map((s) => s.trim())) : null;
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => {
      const { meta, body } = parseFrontmatter(readFileSync(join(dir, f), 'utf8'));
      const id = f.replace(/\.md$/, '');
      return {
        id,
        name: meta.name ?? id,
        model: model || meta.model || DEFAULT_MODEL,
        failOn: (meta.fail_on as FailOn) ?? 'critical',
        specPath: meta.spec || undefined,
        prompt: body,
      };
    })
    .filter((a) => !wanted || wanted.has(a.id));
}
