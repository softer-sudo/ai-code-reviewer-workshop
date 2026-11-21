// Builds index.html (from shell.html + slides.mjs) and workshop.single.html (one offline file).
//   node build.mjs            strict: any missing spec / section / code ref FAILS the build
//   node build.mjs --draft    missing pieces render a red "PENDING: <file> <section>" placeholder instead
//
// Directives (specs are read from the `main` branch of the workshop repo with `git show`):
//   {{prompt:specs/x.md}}   the single ```text block under "## Prompt" (escaped)
//   {{start:specs/x.md}}    the one command under "## Start from"
//   {{lost:specs/x.md}}     the one command under "## Lost?"
//   {{verify:specs/x.md}} / {{expect:specs/x.md}}  the command and the result from the first line of "## Done when"
//   {{done:specs/x.md}}     the "## Done when" section as HTML (paragraphs, <code>, <pre>)
//   {{steps:specs/x.md}}    the "## Steps" numbered list; inline `commands` become copyable .cmd bars
//   {{specmd:specs/x.md}}   the whole spec rendered to HTML (tiny safe renderer, everything escaped)
//   {{specbody:specs/x.md}} same, without Prompt / Start from / Lost? (those live on the Your-turn slide)
//   {{specraw:specs/x.md}}  the whole spec, raw markdown, escaped (for the Copy spec button)
//   {{spec:specs/x.md}}     the spec path itself (fails if the file is not on main)
//   {{files:specs/x.md}}    chips for backticked paths under a "## Files…" heading (empty if the spec has none)
//   {{code:<ref>:<path>[:a-b]}}  file (or lines a..b) from any git ref, escaped
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slides } from './slides.mjs';

// ---- constants ----
const REPO_URL = 'https://github.com/burnjohn/ai-code-reviewer-workshop';
const QUICKBLOG_URL = 'https://github.com/burnjohn/quick-blog';
const OPENROUTER_KEY_NOTE = 'key in the chat';
// specs come from the `main` branch; --worktree reads the files as they are on disk (uncommitted edits)
const SPEC_REF = process.argv.includes('--worktree') ? null : 'main';

const DRAFT = process.argv.includes('--draft');
const dir = dirname(fileURLToPath(import.meta.url));
const REPO = process.env.SPEC_REPO || join(dir, '..', '..');
const git = (ref, path) => execFileSync('git', ['-C', REPO, 'show', `${ref}:${path}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const pending = [];
const pend = (file, what) => { pending.push(`${file} ${what}`); return `<span class="pend">PENDING: ${esc(file)} ${esc(what)}</span>`; };
const fail = (msg, file, what) => { if (DRAFT) return pend(file, what); throw new Error('build: ' + msg); };

const specText = (path) => { try { return SPEC_REF ? git(SPEC_REF, path) : readFileSync(join(REPO, path), 'utf8'); } catch { return null; } };
const section = (md, heading) => {
  const m = new RegExp(`^## ${heading.replace(/[?]/g, '\\?')}[^\\n]*$([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm').exec(md);
  return m ? m[1] : null;
};
// resolve one spec section; returns { v } on success or { err } (a string, or a placeholder in draft mode)
function get(path, heading, optional = false) {
  const md = specText(path);
  if (md === null) return { err: fail(`spec ${path} not found on ${SPEC_REF ?? 'disk'}`, path, heading) };
  const s = section(md, heading);
  if (s === null) return optional ? { v: null } : { err: fail(`"## ${heading}" not found in ${path}`, path, heading) };
  return { v: s };
}
function command(s) {
  const fence = /^```[a-z]*\n([\s\S]*?)\n```/m.exec(s);
  if (fence) return fence[1].trim().split('\n')[0].trim();
  const inline = [...s.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]);
  return inline.find((c) => /^(git|npm|npx|node|gh|cp|cd)\b/.test(c)) ?? inline[0] ?? null;
}
const doneHtml = (s) => {
  const parts = []; let rest = s.trim();
  rest = rest.replace(/```[a-z]*\n([\s\S]*?)\n```/g, (_, c) => { parts.push(`<pre>${esc(c)}</pre>`); return `\u0000${parts.length - 1}\u0000`; });
  return rest.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).map((p) => {
    const m = /^\u0000(\d+)\u0000$/.exec(p); if (m) return parts[+m[1]];
    const html = esc(p).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\u0000(\d+)\u0000/g, (_, k) => parts[+k]);
    return `<p>${html}</p>`;
  }).join('');
};


// ---- tiny safe markdown: headings, lists, tables, fenced + inline code, bold. Everything is escaped first. ----
const inline = (t) => esc(t).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
function mdHtml(md) {
  const L = md.replace(/\r/g, '').split('\n'); const o = []; let i = 0;
  const flushPara = (buf) => { if (buf.length) o.push(`<p>${inline(buf.join(' '))}</p>`); buf.length = 0; };
  let para = [];
  while (i < L.length) {
    const ln = L[i];
    const fence = /^```/.exec(ln);
    if (fence) { flushPara(para); const code = []; i++; while (i < L.length && !/^```/.test(L[i])) code.push(L[i++]); i++; o.push(`<pre>${esc(code.join('\n'))}</pre>`); continue; }
    const h = /^(#{1,6})\s+(.*)$/.exec(ln);
    if (h) { flushPara(para); o.push(`<h${Math.min(h[1].length + 1, 5)}>${inline(h[2])}</h${Math.min(h[1].length + 1, 5)}>`); i++; continue; }
    if (/^\s*\|/.test(ln)) { flushPara(para); const rows = []; while (i < L.length && /^\s*\|/.test(L[i])) rows.push(L[i++]); const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const body = rows.filter((r) => !/^\s*\|?\s*:?-{2,}/.test(r)); o.push('<table>' + body.map((r, k) => `<tr>${cells(r).map((c) => `<${k ? 'td' : 'th'}>${inline(c)}</${k ? 'td' : 'th'}>`).join('')}</tr>`).join('') + '</table>'); continue; }
    const li = /^\s*([-*]|\d+\.)\s+(.*)$/.exec(ln);
    if (li) { flushPara(para); const ord = /\d/.test(li[1]); const items = []; while (i < L.length && /^\s*([-*]|\d+\.)\s+/.test(L[i])) { items.push(L[i].replace(/^\s*([-*]|\d+\.)\s+/, '')); i++; while (i < L.length && /^\s{2,}\S/.test(L[i]) && !/^\s*([-*]|\d+\.)\s/.test(L[i])) items[items.length - 1] += ' ' + L[i++].trim(); }
      o.push(`<${ord ? 'ol' : 'ul'}>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${ord ? 'ol' : 'ul'}>`); continue; }
    if (!ln.trim()) { flushPara(para); i++; continue; }
    para.push(ln.trim()); i++;
  }
  flushPara(para); return o.join('\n');
}
const isCmd = (c) => /^(git|npm|npx|cp|gh|node|claude|cd|export|REVIEW_MOCK|AGENTS)\b/.test(c);
function stepsHtml(s, start) {
  const items = []; for (const ln of s.split('\n')) { const m = /^\s*\d+\.\s+(.*)$/.exec(ln); if (m) items.push(m[1]); else if (/^\s{2,}\S/.test(ln) && items.length) items[items.length - 1] += ' ' + ln.trim(); }
  const rows = [];
  for (const t of items) {
    const codes = [...t.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    const pure = /^`[^`]+`\.?$/.test(t.trim());
    if (pure && codes[0] === start) continue;                       // same as "Start from": do not repeat
    const cmd = codes.find(isCmd);
    const bar = cmd ? `<div class="cmd compact"><span class="pf">$</span><code>${esc(cmd)}</code></div>` : '';
    rows.push(`<div class="sb">${pure && cmd ? '' : `<p>${inline(t)}</p>`}${bar}</div>`);
  }
  if (!rows.length) return null;
  return '<ol class="steps">' + rows.map((r, k) => `<li><span class="stepn sm">${k + 1}</span>${r}</li>`).join('') + '</ol>';
}

let out = slides.join('\n');
out = out.replace(/\{\{prompt:([^}]+)\}\}/g, (_, f) => {
  const r = get(f, 'Prompt'); if (r.err) return r.err;
  const blocks = [...r.v.matchAll(/^```text\n([\s\S]*?)\n```$/gm)];
  if (blocks.length !== 1) return fail(`expected exactly one \`\`\`text block under "## Prompt" in ${f}, found ${blocks.length}`, f, 'Prompt');
  const t = blocks[0][1].trim();
  return esc(t);
});
for (const [name, heading] of [['start', 'Start from'], ['lost', 'Lost?']]) {
  out = out.replace(new RegExp(`\\{\\{${name}:([^}]+)\\}\\}`, 'g'), (_, f) => {
    const r = get(f, heading); if (r.err) return r.err;
    const c = command(r.v); if (!c) return fail(`no command under "## ${heading}" in ${f}`, f, heading);
    return esc(c);
  });
}
// "Done when" starts with `<command>` → `<N passed>`: the check command and its expected result
for (const [name, k] of [['verify', 1], ['expect', 2]]) {
  out = out.replace(new RegExp(`\\{\\{${name}:([^}]+)\\}\\}`, 'g'), (_, f) => {
    const r = get(f, 'Done when'); if (r.err) return r.err;
    const m = /`([^`\n]+)`\s*→\s*`([^`\n]+)`/.exec(r.v); if (!m) return fail(`"## Done when" in ${f} must start with \`command\` → \`result\``, f, 'Done when');
    return esc(m[k]);
  });
}
out = out.replace(/\{\{done:([^}]+)\}\}/g, (_, f) => { const r = get(f, 'Done when'); return r.err ? r.err : doneHtml(r.v); });
out = out.replace(/\{\{steps:([^}]+)\}\}/g, (_, f) => { const r = get(f, 'Steps'); if (r.err) return r.err; const st = get(f, 'Start from'); return stepsHtml(r.v, st.v ? command(st.v) : null) ?? fail(`no numbered steps under "## Steps" in ${f}`, f, 'Steps'); });
out = out.replace(/\{\{specmd:([^}]+)\}\}/g, (_, f) => { const md = specText(f); return md === null ? fail(`spec ${f} not found on ${SPEC_REF}`, f, 'file') : mdHtml(md); });
out = out.replace(/\{\{specbody:([^}]+)\}\}/g, (_, f) => { const md = specText(f); if (md === null) return fail(`spec ${f} not found on ${SPEC_REF}`, f, 'file');
  return mdHtml(md.split(/^(?=## )/m).filter((p) => !/^## (Prompt|Start from|Lost\?)/.test(p)).join('')); });
out = out.replace(/\{\{specraw:([^}]+)\}\}/g, (_, f) => { const md = specText(f); return md === null ? fail(`spec ${f} not found on ${SPEC_REF}`, f, 'file') : esc(md); });
// the parts of "## What to build": `### 1. Title · \`where\`` → <li><b>Title</b><code>where</code></li>
out = out.replace(/\{\{specparts:([^}]+)\}\}/g, (_, f) => {
  const r = get(f, 'What to build'); if (r.err) return r.err;
  const parts = [...r.v.matchAll(/^### \d+\.\s+(.*?)(?:\s+·\s+`([^`]+)`)?\s*$/gm)];
  if (!parts.length) return fail(`no "### N. Title" parts under "## What to build" in ${f}`, f, 'What to build');
  return parts.map((m) => `<li><b>${esc(m[1])}</b>${m[2] ? `<code>${esc(m[2])}</code>` : ''}</li>`).join('');
});
out = out.replace(/\{\{spec:([^}]+)\}\}/g, (_, f) => (specText(f) === null ? fail(`spec ${f} not found on ${SPEC_REF}`, f, 'file') : esc(f)));
out = out.replace(/\{\{files:([^}]+)\}\}/g, (_, f) => {
  const md = specText(f); if (md === null) return fail(`spec ${f} not found on ${SPEC_REF}`, f, 'Files');
  const s = section(md, 'Files'); if (!s) return '';
  return [...new Set([...s.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]))].map((p) => `<span class="chip path">${esc(p)}</span>`).join('');
});
out = out.replace(/\{\{code:([^:}]+):([^:}]+)(?::(\d+)-(\d+))?\}\}/g, (_, ref, path, a, b) => {
  let src; try { src = git(ref, path).replace(/\n$/, ''); } catch { return fail(`code ${ref}:${path} not found`, `${ref}:${path}`, 'code'); }
  if (a) src = src.split('\n').slice(+a - 1, +b).join('\n');
  return esc(src);
});
out = out.replaceAll('{{REPO_URL}}', REPO_URL).replaceAll('{{QUICKBLOG_URL}}', QUICKBLOG_URL).replaceAll('{{OPENROUTER_KEY_NOTE}}', OPENROUTER_KEY_NOTE);
const left = out.match(/\{\{(?:code|prompt|lost|start|verify|expect|done|steps|specparts|specmd|specbody|specraw|spec|files|REPO_URL|QUICKBLOG_URL|OPENROUTER_KEY_NOTE)[^}]*\}\}/g);
if (left) throw new Error('build: unresolved placeholders: ' + [...new Set(left)].join(', '));

const read = (f, enc = 'utf8') => readFileSync(join(dir, f), enc);
let html = read('shell.html').replace('{{SLIDES}}', () => out);
writeFileSync(join(dir, 'index.html'), html);

// ---- single offline file ----
const MIME = { '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp4': 'video/mp4' };
const dataUri = (f) => `data:${MIME[extname(f)]};base64,${read(f, null).toString('base64')}`;
const isLocal = (u) => !/^(data:|https?:|#|%23)/.test(u);
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) => {
  const css = read(href).replace(/url\(("?)([^)"]+)\1\)/g, (m, q, u) => (isLocal(u) ? `url("${dataUri(u)}")` : m));
  return `<style>\n${css}\n</style>`;
});
html = html.replace(/(<img[^>]*\ssrc=")([^"]+)(")/g, (m, a, u, b) => (isLocal(u) ? a + dataUri(u) + b : m));
html = html.replace(/(<video[^>]*\ssrc=")([^"]+)(")/g, (m, a, u, b) => (isLocal(u) ? a + dataUri(u) + b : m));
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => `<script>\n${read(src).replace(/<\/script/gi, '<\\/script')}\n</script>`);
writeFileSync(join(dir, 'workshop.single.html'), html);
console.log(`${DRAFT ? 'DRAFT' : 'STRICT'} build: index.html + workshop.single.html (${(html.length / 1024).toFixed(0)} KB), ${slides.length} slides`);
if (pending.length) console.log(`PENDING (${pending.length}):\n  ` + pending.join('\n  '));
