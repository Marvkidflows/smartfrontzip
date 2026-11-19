#!/usr/bin/env node
// LOCATION: scripts/bundle-report.mjs   (NEW FILE — performance remediation)
// Usage:  npm run build && npm run report:bundle          (optional: node scripts/bundle-report.mjs path/to/dist)
// Reads the REAL production output in dist/ and prints:
//   1. INITIAL JAVASCRIPT for a first visit  = the entry script + every <link rel="modulepreload"> listed in dist/index.html (+ initial CSS).
//      This is what the landing page / login page must download before it works.
//   2. Every generated chunk, with raw (minified), gzip and brotli sizes.
// Sizes are measured on the files themselves — nothing is estimated. gzip/brotli are computed with Node's zlib at maximum level, which is a
// close (slightly optimistic) match for what a web server sends; the server must actually compress (see public/.htaccess).
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';

const dist = process.argv[2] || 'dist';
if (!existsSync(join(dist, 'index.html'))) {
  console.error(`No ${join(dist, 'index.html')} found. Run "npm run build" first.`);
  process.exit(1);
}

const kb = (n) => (n / 1024).toFixed(1).padStart(8) + ' KB';
const sizes = (file) => {
  const buf = readFileSync(file);
  return {
    raw: buf.length,
    gzip: gzipSync(buf, { level: 9 }).length,
    brotli: brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length,
  };
};

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const html = readFileSync(join(dist, 'index.html'), 'utf8');
const refs = (re) => [...html.matchAll(re)].map((m) => m[1].replace(/^\//, ''));
const initialJs = [
  ...refs(/<script[^>]+type="module"[^>]+src="([^"]+)"/g),
  ...refs(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g),
];
const initialCss = refs(/<link[^>]+rel="stylesheet"[^>]+href="(\/?assets\/[^"]+\.css)"/g);

const files = walk(join(dist, 'assets')).filter((f) => ['.js', '.css'].includes(extname(f)));
const rows = files.map((f) => ({ name: f.slice(dist.length + 1).replace(/\\/g, '/'), ext: extname(f), ...sizes(f) }));
const sum = (list, k) => list.reduce((a, r) => a + r[k], 0);

const initJs = rows.filter((r) => initialJs.includes(r.name));
const initCss = rows.filter((r) => initialCss.includes(r.name));
const allJs = rows.filter((r) => r.ext === '.js');

console.log('\n=== INITIAL JAVASCRIPT (first visit, from dist/index.html) ===');
for (const r of initJs) console.log(`${kb(r.raw)} raw  ${kb(r.gzip)} gzip  ${kb(r.brotli)} brotli   ${r.name}`);
console.log(`${kb(sum(initJs, 'raw'))} raw  ${kb(sum(initJs, 'gzip'))} gzip  ${kb(sum(initJs, 'brotli'))} brotli   TOTAL initial JS (${initJs.length} files)`);
console.log(`${kb(sum(initCss, 'raw'))} raw  ${kb(sum(initCss, 'gzip'))} gzip  ${kb(sum(initCss, 'brotli'))} brotli   initial CSS (${initCss.length} files)`);
const target = 250 * 1024;
console.log(`Target: initial JS < 250 KB gzip -> ${sum(initJs, 'gzip') < target ? 'MET' : 'NOT MET'}`);

console.log('\n=== ALL JS CHUNKS (individual files, largest first) ===');
for (const r of [...allJs].sort((a, b) => b.raw - a.raw)) {
  const tag = initialJs.includes(r.name) ? '  [initial]' : '';
  console.log(`${kb(r.raw)} raw  ${kb(r.gzip)} gzip  ${kb(r.brotli)} brotli   ${basename(r.name)}${tag}`);
}
console.log(`${kb(sum(allJs, 'raw'))} raw  ${kb(sum(allJs, 'gzip'))} gzip  ${kb(sum(allJs, 'brotli'))} brotli   TOTAL of all ${allJs.length} JS chunks (NOT downloaded by one visitor)`);
console.log(`Chunks generated: ${allJs.length} JS, ${rows.length - allJs.length} CSS.  Entry chunk is ${initJs.length ? 'listed above' : 'NOT FOUND — check dist/index.html'}.\n`);
