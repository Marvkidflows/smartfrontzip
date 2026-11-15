// LOCATION: src/test/deployFiles.test.js   (NEW FILE)
// Guards the Hostinger deployment: the SPA rewrite rules must live in public/ (Vite copies public/ into dist/, but NOT the project root), otherwise a
// refresh or a direct link to /admin/dashboard, /registration/dashboard etc. returns a server 404.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

const htaccess = () => readFileSync('public/.htaccess', 'utf8');

describe('Hostinger deployment files', () => {
  it('ships an .htaccess in public/ so every build contains it', () => {
    expect(existsSync('public/.htaccess')).toBe(true);
  });

  it('sends every non-file path to index.html (single-page-app routing)', () => {
    const t = htaccess();
    expect(t).toMatch(/RewriteEngine On/);
    expect(t).toMatch(/RewriteCond %\{REQUEST_FILENAME\} !-f/);
    expect(t).toMatch(/RewriteCond %\{REQUEST_FILENAME\} !-d/);
    expect(t).toMatch(/RewriteRule \. \/index\.html \[L\]/);
  });

  it('does not let index.html be cached long-term (stale index.html => blank page after a deploy)', () => {
    expect(htaccess()).toMatch(/FilesMatch "\^index\\\.html\$"[\s\S]*Cache-Control "no-cache/);
  });

  it('keeps every directive inside an IfModule so a missing Apache module cannot cause a 500', () => {
    const lines = htaccess().split('\n').filter((l) => /^\s*(Rewrite|Header|Expires)/.test(l));
    expect(lines.length).toBeGreaterThan(0);
    // each directive line is indented => it is inside a block
    lines.forEach((l) => expect(l).toMatch(/^\s{2,}/));
  });
});
