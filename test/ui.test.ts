import { describe, expect, it } from 'vitest';
import { parseRequest } from '../ui/api.ts';

describe('UI API: parseRequest', () => {
  it('accepts a full request and defaults the booleans', () => {
    const r = parseRequest({ pr: 'burnjohn/quick-blog#34', agents: ['general', 'spec-conformance'], model: 'deepseek/deepseek-v4.1-flash' });
    expect(r).toMatchObject({ ok: true, req: { pr: 'burnjohn/quick-blog#34', noContext: false, mock: false } });
  });
  it('rejects a body that is not an object', () => {
    expect(parseRequest(null).ok).toBe(false);
    expect(parseRequest([]).ok).toBe(false);
    expect(parseRequest('x').ok).toBe(false);
  });
  it('rejects a bad PR reference, agent id or model id', () => {
    expect(parseRequest({ pr: 'not a pr' }).ok).toBe(false);
    expect(parseRequest({ agents: ['../etc/passwd'] }).ok).toBe(false);
    expect(parseRequest({ agents: [] }).ok).toBe(false);
    expect(parseRequest({ model: 'a b; rm' }).ok).toBe(false);
  });
  it('never passes repoDir, ci or dryRun through from the browser', () => {
    const r = parseRequest({ repoDir: '/', ci: true, dryRun: true });
    expect(r.ok && Object.keys(r.req).sort()).toEqual(['agents', 'mock', 'model', 'noContext', 'pr']);
  });
});
