import { describe, expect, it } from 'vitest';
import { countBlockers } from '../src/gate.ts';
import type { Finding } from '../src/schema.ts';

const make = (severity: Finding['severity']): Finding => ({
  file: 'a.ts',
  start_line: 1,
  end_line: 1,
  severity,
  category: 'correctness',
  title: severity,
  rationale: '',
  suggestion: '',
});
const findings = [make('CRITICAL'), make('WARNING'), make('SUGGESTION')];

describe('countBlockers', () => {
  it('critical → only CRITICAL blocks', () => expect(countBlockers(findings, 'critical')).toBe(1));
  it('warning → CRITICAL and WARNING block', () => expect(countBlockers(findings, 'warning')).toBe(2));
  it('any → everything blocks', () => expect(countBlockers(findings, 'any')).toBe(3));
  it('never → nothing blocks', () => expect(countBlockers(findings, 'never')).toBe(0));
});
