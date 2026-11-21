# Step 4 · More reviewers

**Goal.** Three agents (general, security, spec-conformance) run together, and their duplicate findings are merged before the review is posted.
**Why.** Spec-only defects have no wrong line in the diff: something required is missing. A reviewer that reasons from the spec finds them. Three agents also report one bug three times, so you need a merge step and a cost line per agent.

## What to build

### 1. Two agent files · `.reviewer/agents/`
An agent file is frontmatter (`name`, `model`, `fail_on`, optional `spec:`) plus a system prompt. The file name is the agent id.
- Copy `fixtures/agents/security.md` and `fixtures/agents/spec-conformance.md` to `.reviewer/agents/`, with the same file names.
- `security.md`: keep its narrow scope, its negative list and its cap of 5 findings, worst first. Add one rule: every finding names the attacker input.
- `spec-conformance.md`: keep the `spec: docs/specs/analytics-dashboard-spec.md` line, the rule that the AC id (`AC-x.y`) comes first in the title, category `spec`, and "missing code counts". Add a negative list: style, and requirements the PR does not touch.

### 2. The merge step · `src/dedup.ts`
Implement `dedupFindings(perAgent)`.
- Walk the agents in order. For each finding, look for an already merged one with `sameProblem(merged, finding)`. The helper checks the file, overlapping ranges and title similarity.
- No match: push `{ ...finding, agents: [agent] }`.
- Match: add the agent if it is not listed. If the new severity is higher by `RANK`, copy the new finding over the merged one and keep the `agents` list. On equal severity the first report stays.
- Return the list sorted by `RANK` descending, then `file` and `start_line` ascending.

### 3. Already wired, nothing to write
The parallel run, the `AGENTS=…` filter, `REVIEW_MODEL`, and tokens and cost per agent.

## Constraints
- Do not change tests, or any file in `src/` other than `src/dedup.ts`.

## Acceptance
1. WHEN two agents report the same file, overlapping lines and a similar title, the reviewer SHALL merge them, keep the highest severity and list both agents.
2. WHEN a file `<id>.md` is in `.reviewer/agents/`, the reviewer SHALL run it as an agent.
3. WHEN the spec agent has a `spec:` line, the reviewer SHALL put that doc into the context.
4. WHEN all agents finish, the reviewer SHALL print tokens and cost per agent and a deduped total.

## Done when
`npm test` → `45 passed`.

## Steps
1. `git stash && git checkout step-3-gate-action`
2. Paste the prompt into your coding agent.
3. `npm test`
4. `npm run review:mock -- --dry-run`: three agents, and the spec in the context log.
5. `npm run review` (or `npm run ui`): three `■` sections with cost, then `Findings per agent: … → N after dedup`.

## Prompt
```text
Implement Step 4.
Read specs/step-4-more-reviewers.md and follow it exactly.
Do not change tests or src/ files other than src/dedup.ts.
Verify: run `npm test` until 45 passed.
Then run `npm run review:mock -- --dry-run` and show me
the three agents.
```

## Start from
`git stash && git checkout step-3-gate-action`

## Lost?
`git stash && git checkout step-4-more-reviewers`
