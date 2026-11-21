// The engine: context → prompt → structured output → grounding.
// One function for every "door": CLI, GitHub Action and MCP.
import { numberDiff, parseUnifiedDiff } from './diff.ts';
import { buildPrompt } from './prompt.ts';
import { callModel } from './llm.ts';
import { groundFindings } from './grounding.ts';
import type { Agent } from './agents.ts';
import type { AgentOutcome } from './gate.ts';

export interface ReviewInput {
  rawDiff: string;
  prTitle?: string;
  prBody?: string;
  /** Step 2: blocks from gatherContext(); empty with --no-context. */
  context?: string[];
}

export function promptFor(agent: Agent, input: ReviewInput) {
  return buildPrompt({
    agent,
    diff: numberDiff(input.rawDiff),
    prTitle: input.prTitle,
    prBody: input.prBody,
    context: input.context,
  });
}

export async function reviewWithAgent(agent: Agent, input: ReviewInput) {
  const diff = parseUnifiedDiff(input.rawDiff);
  const messages = promptFor(agent, input);
  const llm = await callModel(messages, agent.model, agent.id, input.context?.length ? 'ctx' : 'noctx');
  const { kept, dropped } = groundFindings(llm.review.findings, diff);
  const outcome: AgentOutcome = {
    agent: agent.name,
    failOn: agent.failOn,
    findings: kept,
    droppedCount: dropped.length,
    costUsd: llm.costUsd,
    model: llm.model,
  };
  return { outcome, dropped, llm, diff };
}
