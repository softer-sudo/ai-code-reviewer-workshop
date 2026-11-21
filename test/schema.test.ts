import { describe, expect, it } from 'vitest';
import { FindingSchema, ReviewSchema } from '../src/schema.ts';

const valid = {
  file: 'src/pricing.js',
  start_line: 6,
  end_line: 6,
  severity: 'CRITICAL',
  category: 'correctness',
  title: 'Negative total',
  rationale: 'discount is not capped',
  suggestion: 'Math.max(0, …)',
};

describe('FindingSchema', () => {
  it('accepts a complete finding', () => {
    expect(FindingSchema.safeParse(valid).success).toBe(true);
    expect(FindingSchema.safeParse(valid).data).toEqual(valid); // no field is silently dropped
  });
  it('rejects a category outside the five values', () => {
    expect(FindingSchema.safeParse({ ...valid, category: 'style' }).success).toBe(false);
  });
  it('rejects a finding without severity', () => {
    const { severity: _severity, ...rest } = valid;
    expect(FindingSchema.safeParse(rest).success).toBe(false);
  });
  it('accepts a review with a verdict', () => {
    expect(ReviewSchema.safeParse({ summary: 's', findings: [valid], verdict: 'request_changes' }).success).toBe(true);
  });
});
