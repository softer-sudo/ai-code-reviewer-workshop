// STRETCH — the same engine behind an MCP door.
// The server has no review logic of its own: it is an adapter to gatherContext() + reviewWithAgent() + dedupFindings().
//   claude mcp add ai-reviewer -- npx tsx mcp/server.ts      (run it from the repo you want reviewed)
import '../src/env.ts';
import { execFileSync } from 'node:child_process';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { loadAgents } from '../src/agents.ts';
import { gatherContext } from '../src/context.ts';
import { dedupFindings } from '../src/dedup.ts';
import { reviewWithAgent } from '../src/review.ts';
import { DirSource } from '../src/source.ts';

const server = new McpServer({ name: 'ai-reviewer', version: '2.0.0' });

server.registerTool(
  'review_working_copy',
  {
    title: 'Review my changes',
    description: 'Run the team AI reviewer on uncommitted changes (git diff HEAD) before you push.',
    inputSchema: {
      agents: z.string().optional().describe('Comma-separated agent ids, e.g. "security,spec-conformance"'),
      context: z.boolean().optional().describe('Add repository context (rules, specs, full files, callers). Default true.'),
    },
  },
  async ({ agents, context }) => {
    const rawDiff = execFileSync('git', ['diff', 'HEAD'], { encoding: 'utf8', maxBuffer: 10_000_000 });
    if (!rawDiff.trim()) return { content: [{ type: 'text', text: 'No changes to review.' }] };
    const list = loadAgents('.reviewer/agents', agents);
    const ctx =
      context === false
        ? undefined
        : await gatherContext(new DirSource('.'), {
            rawDiff,
            extraDocs: list.flatMap((a) => (a.specPath ? [a.specPath] : [])),
          });
    const results = await Promise.all(list.map((a) => reviewWithAgent(a, { rawDiff, context: ctx?.blocks })));
    const report = {
      context: ctx?.log ?? [],
      findings: dedupFindings(results.map(({ outcome }) => ({ agent: outcome.agent, findings: outcome.findings }))),
      dropped: results.reduce((n, r) => n + r.dropped.length, 0),
    };
    return { content: [{ type: 'text', text: JSON.stringify(report, null, 2) }] };
  },
);

await server.connect(new StdioServerTransport());
