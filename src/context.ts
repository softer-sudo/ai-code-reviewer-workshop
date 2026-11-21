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
  const text = body.replace(/https?:\/\/\S+/g, (url) => {
    const m = /\/blob\/[^/]+\/(\S+?\.md)/.exec(url);
    return m ? ` ${m[1]} ` : ' ';
  });
  const found: string[] = [];
  for (const m of text.matchAll(/(?<![\w./-])((?:[\w.-]+\/)+[\w.-]+\.md)\b/g)) {
    const p = m[1].replace(/^\.\//, '');
    if (p.startsWith('node_modules/') || p.startsWith('../') || found.includes(p)) continue;
    found.push(p);
  }
  return found.slice(0, MAX_LINKED_DOCS);
}

/**
 * Names of functions / components that the diff CHANGES in files that already existed.
 * (New files are skipped: the diff already contains them in full, and nobody else calls them yet.)
 */
export function extractSymbols(rawDiff: string): string[] {
  const names: string[] = [];
  const defs = [
    /\bfunction\s*\*?\s*([A-Za-z_$][\w$]*)/,
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/,
    /\bclass\s+([A-Za-z_$][\w$]*)/,
    /\bdef\s+([A-Za-z_$][\w$]*)/,
  ];
  let inNewFile = false;
  let skip = false; // current file is data, or new
  const take = (code: string) => {
    for (const re of defs) {
      const name = re.exec(code)?.[1];
      if (name && name.length >= 4 && !STOP_SYMBOLS.has(name) && !names.includes(name)) names.push(name);
    }
  };
  for (const line of rawDiff.split('\n')) {
    if (line.startsWith('diff --git')) {
      inNewFile = false;
      skip = DATA_PATH.test(line.split(' b/')[1] ?? '');
    } else if (line.startsWith('new file mode')) inNewFile = true;
    else if (inNewFile || skip) continue;
    else if (line.startsWith('@@')) take(line.replace(/^@@[^@]*@@/, '')); // enclosing function of the hunk
    else if (line.startsWith('+') && !line.startsWith('+++')) take(line.slice(1));
  }
  return names.slice(0, MAX_SYMBOLS);
}

export interface Hit {
  symbol: string;
  path: string;
  line: number;
  text: string;
}

/** Simple grep: lines that mention a symbol as a whole word. Capped overall and per symbol. */
export function findCallers(symbols: string[], files: { path: string; text: string }[], maxHits = MAX_CALLER_HITS): Hit[] {
  const res = symbols.map((s) => ({ s, re: new RegExp(`(?<![\\w$])${escapeRe(s)}(?![\\w$])`) }));
  const perSymbol = new Map<string, number>();
  const hits: Hit[] = [];
  for (const f of files) {
    const lines = f.text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      for (const { s, re } of res) {
        if (hits.length >= maxHits) return hits;
        if ((perSymbol.get(s) ?? 0) >= 5 || !re.test(lines[i])) continue;
        perSymbol.set(s, (perSymbol.get(s) ?? 0) + 1);
        hits.push({ symbol: s, path: f.path, line: i + 1, text: lines[i].trim().slice(0, 160) });
      }
    }
  }
  return hits;
}

const n = (x: number) => x.toLocaleString('en-US');

/**
 * Fit candidates into the budget. Order: rules, specs, files, callers (stable inside a kind).
 * A candidate is cut to its own cap, then to what is left; too little room → skipped.
 */
export function assembleContext(candidates: Candidate[], budget = DEFAULT_BUDGET): Context {
  const ordered = [...candidates].sort((a, b) => PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind));
  const blocks: string[] = [];
  const log: string[] = [];
  let used = 0;
  for (const c of ordered) {
    if (!c.text.trim()) continue;
    const name = `${c.kind.padEnd(8)} ${c.label}`;
    const room = Math.min(c.maxChars ?? Infinity, budget - used);
    if (room < MIN_USEFUL) {
      log.push(`  ✗ ${name} — skipped (budget exhausted)`);
      continue;
    }
    const cut = c.text.length > room;
    const text = cut ? `${c.text.slice(0, room - TRUNCATED.length)}${TRUNCATED}` : c.text;
    used += text.length;
    blocks.push(`### ${HEADING[c.kind]}: ${c.label}\n${wrapUntrusted(`${c.kind}:${c.label}`, text)}`);
    log.push(`  ${cut ? '~' : '✓'} ${name} — ${n(text.length)} chars${cut ? ` (cut from ${n(c.text.length)})` : ''}`);
  }
  log.push(`  context: ${blocks.length} block(s), ${n(used)} / ${n(budget)} chars (~${n(Math.round(used / 4))} tokens)`);
  return { blocks, log, chars: used, budget };
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

  // (a) project rules
  for (const r of RULES_FILES) {
    const text = await source.read(r.path);
    if (text) candidates.push({ kind: 'rules', label: r.path, text, maxChars: r.max });
  }

  // (b) specs: docs linked from the PR body, docs the PR touches, docs an agent asks for
  const touchedDocs = changed.filter((f) => !f.isDeleted && f.path.startsWith('docs/') && f.path.endsWith('.md')).map((f) => f.path);
  const docs = [...new Set([...extractLinkedDocs(opts.prBody ?? ''), ...touchedDocs, ...(opts.extraDocs ?? [])])].slice(
    0,
    MAX_LINKED_DOCS + 2,
  );
  const docTexts = await mapLimit(docs, 6, (p) => source.read(p));
  docs.forEach((p, i) => docTexts[i] && candidates.push({ kind: 'spec', label: p, text: docTexts[i]!, maxChars: MAX_DOC_CHARS }));

  // (c) full head version of files the PR MODIFIES (new files are already complete in the diff)
  const modified = changed.filter(
    (f) => !f.isNew && !f.isDeleted && CODE_EXT.test(f.path) && !NOT_REVIEWABLE.test(f.path) && !DATA_PATH.test(f.path),
  );
  const fileTexts = await mapLimit(modified, 6, (f) => source.read(f.path));
  modified
    .flatMap((f, i) => (fileTexts[i] ? [{ kind: 'file' as const, label: f.path, text: fileTexts[i]!, maxChars: MAX_FILE_CHARS }] : []))
    .sort((a, b) => a.text.length - b.text.length) // small files first: the most context per character
    .forEach((c) => candidates.push(c));

  // (d) callers: where do the changed symbols appear in files the diff does not touch?
  const symbols = extractSymbols(opts.rawDiff);
  if (symbols.length) {
    const inDiff = new Set(changed.map((f) => f.path));
    const scan = (await source.list())
      .filter((p) => CODE_EXT.test(p) && !inDiff.has(p))
      .sort((a, b) => Math.max(...modified.map((m) => sharedPrefix(b, m.path)), 0) - Math.max(...modified.map((m) => sharedPrefix(a, m.path)), 0) || a.localeCompare(b))
      .slice(0, source.scanLimit);
    const texts = await mapLimit(scan, 8, (p) => source.read(p));
    const files = scan.flatMap((path, i) => (texts[i] ? [{ path, text: texts[i]! }] : []));
    const hits = findCallers(symbols, files);
    if (hits.length) {
      candidates.push({
        kind: 'callers',
        label: symbols.join(', '),
        text: hits.map((h) => `${h.path}:${h.line}  [${h.symbol}]  ${h.text}`).join('\n'),
        maxChars: 4_000,
      });
    }
  }

  return assembleContext(candidates, budget);
}
