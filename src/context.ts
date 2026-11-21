// STEP 2 — repository context: what the model gets BESIDE the diff.
// Priority when the budget runs out: project rules > specs > full changed files > callers.
// Every block is wrapped with wrapUntrusted(): repository files can be edited by the PR author.
import { wrapUntrusted } from './prompt.ts';
import type { RepoSource } from './source.ts';

export const DEFAULT_BUDGET = 60_000; // characters (≈ 15k tokens) on top of the diff and the PR text
export const RULES_FILES = [
  { path: 'CLAUDE.md', max: 6_000 },
  { path: 'AGENTS.md', max: 6_000 },
  { path: 'README.md', max: 3_000 },
];
const MAX_LINKED_DOCS = 5;
const MAX_DOC_CHARS = 16_000;
const MAX_FILE_CHARS = 12_000;
const MAX_CALLER_HITS = 20;
const MAX_SYMBOLS = 12;
// Words that are never worth searching for as callers.
const STOP_SYMBOLS = new Set(['default', 'handler', 'render', 'return', 'async', 'await', 'function', 'constructor']);
const TRUNCATED = '\n[… truncated]';
const MIN_USEFUL = 300; // a block with less room than this is skipped, not squeezed in

export type Kind = 'rules' | 'spec' | 'file' | 'callers';
const PRIORITY: Kind[] = ['rules', 'spec', 'file', 'callers'];
const HEADING: Record<Kind, string> = {
  rules: 'Project rules',
  spec: 'Specification / docs',
  file: 'Full file (head version)',
  callers: 'Usages outside the diff',
};

export interface Candidate {
  kind: Kind;
  label: string;
  text: string;
  /** Per-block cap, applied before the shared budget. */
  maxChars?: number;
}

export interface Context {
  /** Ready for buildPrompt({ context }): each block is wrapped with wrapUntrusted(). */
  blocks: string[];
  /** Human-readable log: what was included, truncated or skipped, and how big. */
  log: string[];
  chars: number;
  budget: number;
}

export interface ChangedFile {
  path: string;
  isNew: boolean;
  isDeleted: boolean;
}

// READY — which files does the diff touch, and is the file new / deleted?
export function changedFiles(rawDiff: string): ChangedFile[] {
  const files: ChangedFile[] = [];
  for (const line of rawDiff.split('\n')) {
    const head = /^diff --git a\/.+ b\/(.+)$/.exec(line);
    if (head) files.push({ path: head[1], isNew: false, isDeleted: false });
    else if (line.startsWith('new file mode')) files.at(-1)!.isNew = true;
    else if (line.startsWith('deleted file mode')) files.at(-1)!.isDeleted = true;
  }
  return files;
}

const CODE_EXT = /\.(?:[cm]?[jt]sx?|py|go|java|rb|rs|php|cs|kt|swift|vue|svelte)$/;
const NOT_REVIEWABLE = /(?:\.min\.|\.test\.|\.spec\.|\.d\.ts$)/;
// Data, not logic: seeds, fixtures, assets, migrations. Too big and too noisy to be useful context.
const DATA_PATH = /(?:^|\/)(?:fixtures?|assets?|migrations?|__snapshots__)\/|(?:^|\/)seed[\w.-]*\.[jt]sx?$/;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Paths like docs/specs/foo.md mentioned in the PR body (plain, in backticks, or as a /blob/<ref>/ URL). */
export function extractLinkedDocs(body: string): string[] {
  // TODO(step 2): return up to MAX_LINKED_DOCS unique repo paths ending in .md that contain a '/'.
  //   - a URL like https://github.com/o/r/blob/main/docs/x.md → 'docs/x.md'; any other URL is ignored
  //   - strip a leading './'; ignore node_modules/ and ../ ; keep order of appearance
  void body;
  return [];
}

/**
 * Names of functions / components that the diff CHANGES in files that already existed.
 * (New files are skipped: the diff already contains them in full, and nobody else calls them yet.)
 */
export function extractSymbols(rawDiff: string): string[] {
  // TODO(step 2): scan the diff of NON-new files that do not match DATA_PATH. Take names from
  //   - added lines (+): `function name`, `const name = (…) =>`, `const name = async x =>`, `class name`, `def name`
  //   - the text after the second @@ of a hunk header (the enclosing function)
  //   Keep names of 4+ characters, unique, at most MAX_SYMBOLS, never a word in STOP_SYMBOLS.
  void rawDiff;
  return [];
}

export interface Hit {
  symbol: string;
  path: string;
  line: number;
  text: string;
}

/** Simple grep: lines that mention a symbol as a whole word. Capped overall and per symbol. */
export function findCallers(symbols: string[], files: { path: string; text: string }[], maxHits = MAX_CALLER_HITS): Hit[] {
  // TODO(step 2): for every line of every file, one Hit per (line, symbol) where the symbol appears as a whole word
  //   (not inside a longer identifier). At most `maxHits` hits overall and 5 per symbol. text = trimmed line, max 160 chars.
  void symbols;
  void files;
  void maxHits;
  return [];
}

const n = (x: number) => x.toLocaleString('en-US');

/**
 * Fit candidates into the budget. Order: rules, specs, files, callers (stable inside a kind).
 * A candidate is cut to its own cap, then to what is left; too little room → skipped.
 */
export function assembleContext(candidates: Candidate[], budget = DEFAULT_BUDGET): Context {
  // TODO(step 2): sort by PRIORITY, then for every non-empty candidate:
  //   room = min(maxChars, budget - used); room < MIN_USEFUL → log "✗ … skipped (budget exhausted)"
  //   text longer than room → cut it so that text + TRUNCATED fits in `room`
  //   block = `### ${HEADING[kind]}: ${label}\n${wrapUntrusted(`${kind}:${label}`, text)}`
  //   log one line per candidate (✓ included, ~ truncated, ✗ skipped) and a final "context: …" summary line.
  void candidates;
  return { blocks: [], log: ['  context: not implemented yet (step 2)'], chars: 0, budget };
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

const sharedPrefix = (a: string, b: string) => {
  const x = a.split('/');
  const y = b.split('/');
  let i = 0;
  while (i < x.length - 1 && x[i] === y[i]) i++;
  return i;
};

export interface GatherOptions {
  rawDiff: string;
  prBody?: string;
  /** Extra docs to include, e.g. the `spec:` of an agent. */
  extraDocs?: string[];
  budget?: number;
}

export async function gatherContext(source: RepoSource, opts: GatherOptions): Promise<Context> {
  const budget = opts.budget ?? (Number(process.env.CONTEXT_BUDGET) || DEFAULT_BUDGET);
  const changed = changedFiles(opts.rawDiff);
  const candidates: Candidate[] = [];
  // TODO(step 2): collect candidates, then `return assembleContext(candidates, budget)`.
  //   (a) rules   : every RULES_FILES entry that source.read() returns  → { kind: 'rules', maxChars: r.max }
  //   (b) specs   : extractLinkedDocs(prBody) + changed docs/**/*.md + opts.extraDocs (max MAX_LINKED_DOCS + 2),
  //                 { kind: 'spec', maxChars: MAX_DOC_CHARS }
  //   (c) files   : MODIFIED (not new, not deleted) files that match CODE_EXT and neither NOT_REVIEWABLE nor DATA_PATH,
  //                 head version via source.read(), { kind: 'file', maxChars: MAX_FILE_CHARS }, smallest file first
  //   (d) callers : extractSymbols(rawDiff) → read up to source.scanLimit code files from source.list()
  //                 that are NOT in the diff → findCallers() → one { kind: 'callers', maxChars: 4_000 } block
  //   Use mapLimit() for parallel reads.
  void changed;
  void candidates;
  void source;
  return { blocks: [], log: ['  context: not implemented yet (step 2)'], chars: 0, budget };
}
