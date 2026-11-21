import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The workflow participants copy into their QuickBlog fork. These are the 4 security rules, checked as text.
const yml = readFileSync('examples/quick-blog-workflow.yml', 'utf8');
const code = yml
  .split('\n')
  .filter((l) => !l.trim().startsWith('#'))
  .join('\n'); // comments may mention anything

describe('examples/quick-blog-workflow.yml', () => {
  it('rule 1: triggers on pull_request, never pull_request_target', () => {
    expect(code).toMatch(/^\s*pull_request:/m);
    expect(code).not.toMatch(/pull_request_target/);
  });
  it('rule 2: least-privilege permissions', () => {
    expect(code).toMatch(/^permissions:\s*\n\s+contents: read\s*\n\s+pull-requests: write/m);
    expect(code).not.toMatch(/write-all|contents: write/);
  });
  it('rule 3: fork guard', () => {
    expect(code).toMatch(/if:\s*github\.event\.pull_request\.head\.repo\.full_name\s*==\s*github\.repository/);
  });
  it('every checkout sets persist-credentials: false', () => {
    const checkouts = code.match(/uses: actions\/checkout@/g) ?? [];
    const safe = code.match(/persist-credentials: false/g) ?? [];
    expect(checkouts.length).toBe(2);
    expect(safe.length).toBe(checkouts.length);
  });
  it('rule 4: PR text never reaches a run: line through ${{ }}', () => {
    const runs = code.split('\n').filter((l) => /^\s*-?\s*run:/.test(l));
    expect(runs.length).toBeGreaterThan(0);
    for (const r of runs) expect(r).not.toMatch(/\$\{\{/);
    expect(code).not.toMatch(/pull_request\.(title|body)|head\.ref/); // not even through env
  });
});
