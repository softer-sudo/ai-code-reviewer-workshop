// READY — minimal unified-diff parser. Records which NEW-side line numbers each hunk covers.

export interface DiffHunk {
  /** New-side line numbers covered by this hunk (added + context lines). */
  newLineNumbers: number[];
}

export interface DiffFile {
  path: string;
  hunks: DiffHunk[];
}

export interface UnifiedDiff {
  files: DiffFile[];
}

export function parseUnifiedDiff(raw: string): UnifiedDiff {
  const files: DiffFile[] = [];
  let current: DiffFile | null = null;
  let hunk: DiffHunk | null = null;
  let cursor = 0;

  const flushFile = () => {
    if (current?.path) files.push(current);
    current = null;
    hunk = null;
  };

  const lines = raw.split('\n');
  if (lines.at(-1) === '') lines.pop();

  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      flushFile();
      current = { path: '', hunks: [] };
    } else if (line.startsWith('+++ ')) {
      current ??= { path: '', hunks: [] };
      const p = line.slice(4).replace(/^b\//, '').trim();
      if (p !== '/dev/null') current.path = p;
    } else if (line.startsWith('--- ')) {
      continue;
    } else if (/^@@ /.test(line)) {
      const start = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
      if (!current || !start) continue;
      hunk = { newLineNumbers: [] };
      current.hunks.push(hunk);
      cursor = Number(start[1]);
    } else if (hunk && !line.startsWith('-') && !line.startsWith('\\')) {
      hunk.newLineNumbers.push(cursor++); // added or context line (deleted lines have no new-side number)
    }
  }
  flushFile();
  return { files };
}

/** Prefix every new-side line with its number so the model can cite real lines. */
export function numberDiff(raw: string): string {
  let cursor = 0;
  return raw
    .split('\n')
    .map((line) => {
      const hh = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
      if (hh) {
        cursor = Number(hh[1]);
        return line;
      }
      if (/^(diff --git|index |--- |\+\+\+ |\\)/.test(line) || cursor === 0) return line;
      if (line.startsWith('-')) return `     ${line}`;
      return `${String(cursor++).padStart(4)} ${line}`;
    })
    .join('\n');
}
