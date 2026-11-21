# Step 2 · Repository context

**Goal.** The reviewer sees more than the diff: project rules, the spec, the full files the PR changes, and callers of what it touches, within a fixed budget.
**Why.** A diff cannot show a missing check, a broken project rule or a broken caller. The model can only reason about what is in its prompt.

## What to build

Everything is in `src/context.ts`. Replace the TODOs; the types, constants, `changedFiles` and `mapLimit` are given.

### 1. Linked docs · `extractLinkedDocs(body)`
- Up to `MAX_LINKED_DOCS` unique paths that end in `.md` and contain a `/`, in the order they appear in the PR body.
- A `/blob/<ref>/<path>.md` URL gives `<path>`. Other URLs, `node_modules/` and `../` are ignored. Strip a leading `./`.

### 2. Changed symbols · `extractSymbols(rawDiff)`
- Skip new files and `DATA_PATH` files.
- Take names from added lines (`function x`, `const x = (...) =>`, `class x`, `def x`) and from the text after the second `@@` of a hunk header.
- 4+ chars, unique, not in `STOP_SYMBOLS` (given), max `MAX_SYMBOLS`.

### 3. Callers · `findCallers(symbols, files, maxHits)`
- Whole-word match per line. Max `maxHits` overall, 5 per symbol.
- `text` = the trimmed line, cut to 160 chars.

### 4. The budget · `assembleContext(candidates, budget)`
- Sort by `PRIORITY`: rules > spec > file > callers.
- `room = min(maxChars, budget - used)`. When `room < MIN_USEFUL`, skip the block and log `✗ … skipped (budget exhausted)`.
- Longer text is cut to fit `room`, with `TRUNCATED` appended.
- Every block is wrapped as untrusted data:
```ts
`### ${HEADING[kind]}: ${label}\n${wrapUntrusted(`${kind}:${label}`, text)}`
```
- Log one line per candidate: `✓` (added), `~` (cut from N) or `✗` (skipped), then a final `context: N block(s), X / BUDGET chars (~T tokens)`.
- Return `{ blocks, log, chars, budget }`.

### 5. Putting it together · `gatherContext(source, opts)`
- Rules: `RULES_FILES`.
- Docs: linked docs + changed `docs/**/*.md` + `extraDocs`, max `MAX_LINKED_DOCS + 2`, each up to `MAX_DOC_CHARS`.
- Files: modified code files (`CODE_EXT`, not `NOT_REVIEWABLE` or `DATA_PATH`), smallest first, each up to `MAX_FILE_CHARS`.
- Callers: usages of the symbols in `source.list()` files outside the diff (up to `source.scanLimit`), skipping `node_modules`, as one block with `maxChars` 4000: label = the symbols joined with `, `, one line per hit as `<path>:<line>  [<symbol>]  <text>`.

## Constraints
- Do not change tests, `src/source.ts` or `src/index.ts`.

## Acceptance
1. WHEN the PR body links a doc, or the diff touches `docs/**/*.md`, the reviewer SHALL add it as a spec block.
2. WHEN the diff changes a function, the reviewer SHALL list its usages outside the diff and skip `node_modules`.
3. WHEN the total exceeds the budget, the reviewer SHALL cut a block to the room left, or skip it when the room is under `MIN_USEFUL`, in priority order, and log it.
4. WHEN blocks are built, every one SHALL be wrapped as untrusted data.

## Done when
`npm test -- context` → `16 passed` (full `npm test`: `10 failed | 35 passed`, steps 3–4).

## Steps
1. `git stash && git checkout step-1-findings`
2. Paste the prompt into your coding agent.
3. `npm test -- context`
4. `npm run review:mock -- --dry-run`: the log lists `CLAUDE.md` and `docs/specs/analytics-dashboard-spec.md`, then `context: N block(s), X / 60,000 chars`.
5. Add `--no-context` and compare the prompt size (or use `npm run ui`).

## Prompt
```text
Implement Step 2.
Read specs/step-2-context.md and follow it exactly.
Do not change tests, src/source.ts or src/index.ts.
Verify: run `npm test -- context` until 16 passed.
Then run `npm run review:mock -- --dry-run`, show me the
context log, and run it again with --no-context.
```

## Start from
`git stash && git checkout step-1-findings`

## Lost?
`git stash && git checkout step-2-context`
