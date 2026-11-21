import { describe, expect, it } from 'vitest';
import { dedupFindings } from '../src/dedup.ts';
import type { Finding } from '../src/schema.ts';

const f = (over: Partial<Finding>): Finding => ({
  file: 'server/a.js',
  start_line: 10,
  end_line: 12,
  severity: 'WARNING',
  category: 'security',
  title: 'Visitor key can be set from the request body',
  rationale: 'because',
  suggestion: '',
  ...over,
});

describe('dedupFindings', () => {
  it('keeps unrelated findings separate', () => {
    const out = dedupFindings([
      { agent: 'general', findings: [f({})] },
      { agent: 'security', findings: [f({ file: 'server/b.js' }), f({ start_line: 80, end_line: 80 })] },
    ]);
    expect(out).toHaveLength(3);
  });
  it('merges the same problem reported by two agents and records both names', () => {
    const out = dedupFindings([
      { agent: 'general', findings: [f({})] },
      { agent: 'security', findings: [f({ start_line: 11, end_line: 11, title: 'Request body can set the visitor key' })] },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].agents).toEqual(['general', 'security']);
  });
  it('keeps the highest severity and the text of that report', () => {
    const out = dedupFindings([
      { agent: 'general', findings: [f({ severity: 'WARNING', rationale: 'weak' })] },
      { agent: 'security', findings: [f({ severity: 'CRITICAL', rationale: 'strong' })] },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe('CRITICAL');
    expect(out[0].rationale).toBe('strong');
    expect(out[0].agents).toEqual(['general', 'security']);
  });
  it('does not merge different problems on the same lines', () => {
    const out = dedupFindings([
      { agent: 'general', findings: [f({})] },
      { agent: 'security', findings: [f({ title: 'Missing rate limit on the endpoint' })] },
    ]);
    expect(out).toHaveLength(2);
  });
  it('does not list the same agent twice', () => {
    const out = dedupFindings([{ agent: 'general', findings: [f({}), f({ start_line: 12, end_line: 14 })] }]);
    expect(out).toHaveLength(1);
    expect(out[0].agents).toEqual(['general']);
  });
  it('sorts by severity, then file, then line', () => {
    const out = dedupFindings([
      { agent: 'a', findings: [f({ severity: 'SUGGESTION', title: 'rename' }), f({ severity: 'CRITICAL', file: 'z.js', title: 'boom' }), f({ severity: 'CRITICAL', file: 'a.js', title: 'bang' })] },
    ]);
    expect(out.map((x) => x.title)).toEqual(['bang', 'boom', 'rename']);
  });
});
