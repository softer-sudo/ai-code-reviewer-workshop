import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseUnifiedDiff } from '../src/diff.ts';
import { groundFindings } from '../src/grounding.ts';
import type { Finding } from '../src/schema.ts';

// pricing.js: one hunk covering new lines 1-13. export.js: new file, lines 1-3.
const diff = parseUnifiedDiff(readFileSync('test/fixtures/sample.diff', 'utf8'));

const f = (file: string, start: number, end = start): Finding => ({
  file,
  start_line: start,
  end_line: end,
  severity: 'WARNING',
  category: 'correctness',
  title: `finding at ${file}:${start}`,
  rationale: '',
  suggestion: '',
});

describe('groundFindings', () => {
  it('keeps a finding on an added line', () => {
    const { kept, dropped } = groundFindings([f('src/pricing.js', 7)], diff);
    expect(kept).toHaveLength(1);
    expect(dropped).toHaveLength(0);
  });
  it('drops a finding whose file is not in the diff', () => {
    const { kept, dropped } = groundFindings([f('src/db.js', 3)], diff);
    expect(kept).toHaveLength(0);
    expect(dropped[0].reason).toMatch(/not in the diff/);
  });
  it('drops a finding on a line outside every hunk', () => {
    const { kept, dropped } = groundFindings([f('src/pricing.js', 40)], diff);
    expect(kept).toHaveLength(0);
    expect(dropped[0].reason).toMatch(/do not touch any hunk/);
  });
  it('keeps a range that only partly overlaps a hunk', () => {
    const { kept } = groundFindings([f('src/pricing.js', 10, 30)], diff);
    expect(kept).toHaveLength(1);
  });
  it('accepts a reversed range (end before start)', () => {
    const { kept } = groundFindings([f('src/pricing.js', 12, 9)], diff);
    expect(kept).toHaveLength(1);
  });
  it('checks each finding on its own', () => {
    const { kept, dropped } = groundFindings([f('src/export.js', 2), f('src/export.js', 99), f('nope.js', 1)], diff);
    expect(kept).toHaveLength(1);
    expect(dropped).toHaveLength(2);
  });
});
