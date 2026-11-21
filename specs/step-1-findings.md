# Step 1 · Findings you can trust

**Goal.** The model answers with a typed object, and every finding is checked against the diff before anyone sees it.
**Why.** The schema is the contract between model and code. Models hallucinate locations, and a comment on a line outside the diff cannot even be posted.

## What to build

### 1. The shape of a finding · `src/schema.ts`
- Add five fields to `FindingSchema`, after `end_line`: `severity` (`Severity`), `category` (`z.enum` of `security`, `correctness`, `performance`, `spec`, `maintainability`), `title`, `rationale`, `suggestion`.
- `title`, `rationale` and `suggestion` are strings with `.describe()`. `suggestion` is `''` when there is none.
- Replace the temporary `Finding` and `Review` types with `z.infer` of their schemas.

### 2. The rules in the prompt · `src/prompt.ts`
Replace the three TODO blocks and keep their headings.
- `SEVERITY_RUBRIC`: one concrete line each for CRITICAL, WARNING, SUGGESTION.
- `VERDICT_SEMANTICS`: `request_changes` = at least one CRITICAL, `comment` = only WARNING/SUGGESTION, `approve` = no findings.
- `FINDINGS_DISCIPLINE`: only added or changed lines, cite NEW-side line numbers as printed, one finding per root cause, zero findings is valid.
- Do not touch `INJECTION_GUARD` or `wrapUntrusted`.

### 3. The grounding check · `src/grounding.ts`
Implement `groundFindings(findings, diff)`. Use `buildLineIndex(diff)`, which is already written.
- The file is not in the index → dropped, reason `file '<path>' is not in the diff`.
- `lo` / `hi` = min / max of `start_line` and `end_line`. No line of `lo..hi` is in the index → dropped, reason `lines <lo>-<hi> do not touch any hunk in '<path>'`.
- Otherwise kept.

## Constraints
- Do not change tests, fixtures or any other file.

## Acceptance
1. WHEN a finding has an unknown category or no severity, the schema SHALL reject it.
2. WHEN a finding's file is not in the diff, or its lines miss every hunk, the reviewer SHALL drop it with the exact reason above.
3. WHEN a range partly overlaps a hunk, or start is after end, the reviewer SHALL keep it.
4. WHEN the prompt is built, it SHALL contain no `TODO` and keep the injection guard.

## Done when
`npm test -- schema grounding` → `10 passed` (full `npm test`: `23 failed | 22 passed`, those are steps 2–4).

## Steps
1. `git checkout main`
2. Paste the prompt into your coding agent.
3. `npm test -- schema grounding`
4. `npm run review:mock` (or `npm run review` / `npm run ui`): no `undefined`; each `DROPPED` line has a reason.

## Prompt
```text
Implement Step 1.
Read specs/step-1-findings.md and follow it exactly.
Do not change tests, fixtures or any other file.
Verify: run `npm test -- schema grounding` until 10 passed.
Then run `npm run review:mock` and show me the findings.
```

## Start from
`git checkout main`

## Lost?
`git stash && git checkout step-1-findings`
