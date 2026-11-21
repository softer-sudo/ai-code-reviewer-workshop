// Builds talk.single.html from index.html: inlines stylesheets, fonts, images and scripts
// so the deck runs offline from one file. Also writes talk.artifact.html (videos stay in media/).  Usage: node build-single.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const read = (f, enc = 'utf8') => readFileSync(join(dir, f), enc);
const MIME = { '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.gif': 'image/gif' };
const dataUri = (f) => `data:${MIME[extname(f)]};base64,${read(f, null).toString('base64')}`;
const isLocal = (u) => !/^(data:|https?:|#|%23)/.test(u);

let html = read('index.html');
// stylesheets → <style>, with fonts/images inside url() turned into data URIs
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) => {
  const css = read(href).replace(/url\(("?)([^)"]+)\1\)/g, (m, q, u) => (isLocal(u) ? `url("${dataUri(u)}")` : m));
  return `<style>\n${css}\n</style>`;
});
// <img src="img/..."> → data URIs
html = html.replace(/(<img[^>]*\ssrc=")([^"]+)(")/g, (m, a, u, b) => (isLocal(u) ? a + dataUri(u) + b : m));
// videos: the offline file inlines them; the artifact build keeps them as separate files (media/…)
// published next to the page, so a phone never has to hold ~10 MB of base64 in memory
const inlineVideos = (h) => h.replace(/(<video[^>]*\sdata-src=")([^"]+)(")/g, (m, a, u, b) => (isLocal(u) ? a + dataUri(u) + b : m));
// <script src> → inline
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => `<script>\n${read(src).replace(/<\/script/gi, '<\\/script')}\n</script>`);

const single = inlineVideos(html);
writeFileSync(join(dir, 'talk.single.html'), single);
console.log(`talk.single.html: ${(single.length / 1024).toFixed(0)} KB`);
writeFileSync(join(dir, 'talk.artifact.html'), html);
console.log(`talk.artifact.html: ${(html.length / 1024).toFixed(0)} KB  (+ media/*.mp4 published as separate files)`);
