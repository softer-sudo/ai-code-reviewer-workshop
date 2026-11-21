# Step 3 · Gate + GitHub Action

**Goal.** Pass or fail is decided by code, and the reviewer runs on every PR in your QuickBlog fork with inline comments and a red or green check.
**Why.** A model can say "approve" while listing a CRITICAL finding. And the workflow that holds your secrets must be safe against code from a pull request.

## What to build

### 1. The gate · `src/gate.ts`
- `countBlockers(findings, failOn)` returns how many findings have `RANK[f.severity] >= MIN_RANK[failOn]`. Both tables are in the file.
- `critical` → only CRITICAL; `warning` → CRITICAL and WARNING; `any` → all; `never` → 0.
- Never read the model's `verdict`.
- Remove the `void` / `return 0` placeholder and its TODO.

### 2. The workflow · `examples/quick-blog-workflow.yml`
Replace the three TODO comments.
- A top-level `permissions:` block with `contents: read` and `pull-requests: write`.
- A fork guard on the review job: `if: github.event.pull_request.head.repo.full_name == github.repository`.
- `persist-credentials: false` in the `with:` of both `actions/checkout` steps (one TODO covers both).

Keep what is already right: the trigger is `on: pull_request` (never `pull_request_target`), and no PR text goes inside `${{ }}` in a `run:` line.

## Constraints
- Do not change tests or any other file.
- Do not push, commit or touch any remote. You push the workflow yourself.

## Acceptance
1. WHEN `failOn` is `critical`, the reviewer SHALL count only CRITICAL; for `warning` and `any` it SHALL count lower severities too; for `never`, zero.
2. WHEN the workflow file is read, it SHALL follow the four security rules in its header.
3. WHEN blockers exist, the reviewer SHALL print `Gate: FAIL` and exit 1.
4. WHEN the PR is opened in your fork, the workflow SHALL post one review with inline comments, red exactly when `blockers` > 0.

## Done when
`npm test -- gate workflow` → `9 passed` (full `npm test`: `4 failed | 41 passed`, step 4).

## Steps
1. `git stash && git checkout step-2-context`
2. Paste the prompt into your coding agent, then `npm test -- gate workflow`.
3. Fork `burnjohn/quick-blog` (untick "Copy the main branch only"); in the fork enable Actions, then add your OpenRouter key: Settings → Secrets and variables → Actions → New repository secret, name `OPENROUTER_API_KEY`, value = the key from your `.env`.
4. In your fork on GitHub: Add file → Create new file, name `.github/workflows/ai-review.yml`, paste your `examples/quick-blog-workflow.yml`, commit to `main` (you do this, not the agent). CI takes about 2–3 minutes. CI runs your reviewer repo's `final` branch; to run your own code, push it to a new branch and set the Actions variable `REVIEWER_REF` to it.
5. Open a PR in your fork: base `main`, compare `analytics` (`gh pr create -R <you>/quick-blog -B main -H analytics -t Analytics -b ""`). Check the Actions tab and "Files changed".

## Prompt
```text
Implement Step 3.
Read specs/step-3-github-action.md and follow it exactly.
Do not change tests or any other file.
Do not push, commit or touch any remote.
Verify: run `npm test -- gate workflow` until 9 passed.
Then show me the final workflow file.
```

## Start from
`git stash && git checkout step-2-context`

## Lost?
`git stash && git checkout step-3-gate-action`
