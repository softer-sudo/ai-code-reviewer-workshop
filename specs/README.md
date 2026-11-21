# Specs

Each step has one spec: the goal, what to build part by part, constraints, acceptance criteria with a check command, a short prompt for your coding agent, and how to start or recover. The spec is the whole instruction: the prompt only points the agent at it.

| Step | Spec | Start from | Checkpoint (solution) |
|---|---|---|---|
| 1 · Findings you can trust | [step-1-findings.md](step-1-findings.md) | `main` | `step-1-findings` |
| 2 · Repository context | [step-2-context.md](step-2-context.md) | `step-1-findings` | `step-2-context` |
| 3 · Gate + GitHub Action | [step-3-github-action.md](step-3-github-action.md) | `step-2-context` | `step-3-gate-action` |
| 4 · More reviewers | [step-4-more-reviewers.md](step-4-more-reviewers.md) | `step-3-gate-action` | `step-4-more-reviewers` |

`npm test` is red on `main` by design: 29 failed | 16 passed. Each step turns its own tests green: after step 1 `23 failed`, after step 2 `10 failed`, after step 3 `4 failed`, after step 4 all 45 pass.

The local UI (`npm run ui`, http://127.0.0.1:3000) is ready-made on every branch, not a step: it runs the same engine as `npm run review` and shows the result of whatever you have built so far.
