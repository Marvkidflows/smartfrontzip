// LOCATION: src/utils/safeHtml.test.js — F-11. STATUS: written, NOT executed by the author (vitest is not installed in the authoring environment).
import { describe, it, expect } from 'vitest';
import { safeHtml, isSafeUrl, isSafeStyle } from './safeHtml';

const payloads = [
  '<script>window.__x=1</script><p>hi</p>',
  '<img src=x onerror="window.__x=1">',
  '<svg onload="window.__x=1"><circle/></svg>',
  '<a href="javascript:window.__x=1">x</a>',
  '<a href="jav&#x09;ascript:window.__x=1">x</a>',
  '<a href=" JaVaScRiPt:window.__x=1">x</a>',
  '<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>',
  '<iframe src="https://evil.example"></iframe>',
  '<p onclick="window.__x=1" onmouseover="window.__x=1">x</p>',
  '<p style="width:expression(alert(1))">x</p>',
  '<p style="background:url(javascript:alert(1))">x</p>',
  '<form action="https://evil.example"><input name=pw></form>',
  '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
  '<noscript><p title="</noscript><img src=x onerror=alert(1)>">',
  '<math><mtext><script>alert(1)</script></mtext></math>',
  '<!--><script>alert(1)</script>-->',
];

describe('safeHtml', () => {
  it.each(payloads)('removes executable content: %s', (p) => {
    const out = safeHtml(p).toLowerCase();
    for (const bad of ['<script', 'onerror', 'onload', 'onclick', 'onmouseover', 'javascript:', 'data:text/html', '<iframe', '<form', '<meta', 'expression(', '<svg', '<math']) {
      expect(out).not.toContain(bad);
    }
  });

  it('does not execute anything while sanitising', () => {
    window.__x = 0;
    safeHtml('<img src=x onerror="window.__x=1"><script>window.__x=1</script>');
    expect(window.__x).toBe(0);
  });

  it('cannot reach the auth token: no script can run to read localStorage', () => {
    localStorage.setItem('auth_token', 'secret');
    const host = document.createElement('div');
    host.innerHTML = safeHtml('<img src=x onerror="window.__stolen=localStorage.getItem(\'auth_token\')"><script>window.__stolen=localStorage.getItem("auth_token")</script>');
    expect(window.__stolen).toBeUndefined();
    localStorage.removeItem('auth_token');
  });

  it('keeps the formatting the composer produces', () => {
    const out = safeHtml('<p style="color:#ff0000;text-align:center"><strong>Bold</strong> <em>it</em></p><ul><li>a</li></ul><a href="https://example.com/x">l</a>');
    expect(out).toContain('<strong>Bold</strong>');
    expect(out).toContain('<li>a</li>');
    expect(out).toContain('href="https://example.com/x"');
    expect(out).toContain('noopener');
    expect(out).toContain('color:#ff0000');
  });

  it('url / style validators', () => {
    expect(isSafeUrl('https://a.example')).toBe(true);
    expect(isSafeUrl('mailto:a@b.co')).toBe(true);
    expect(isSafeUrl('java\tscript:alert(1)')).toBe(false);
    expect(isSafeUrl('data:image/png;base64,AAAA', { image: true })).toBe(true);
    expect(isSafeUrl('data:image/svg+xml;base64,AAAA', { image: true })).toBe(false);
    expect(isSafeStyle('color:red')).toBe(true);
    expect(isSafeStyle('background:url(x)')).toBe(false);
  });

  it('fails closed on empty / oversize input', () => {
    expect(safeHtml('')).toBe('');
    expect(safeHtml(null)).toBe('');
    expect(safeHtml('x'.repeat(2_000_001))).toBe('');
  });

  it('R-F11: strips positioning/overlay CSS but keeps harmless formatting', () => {
    const out = safeHtml('<div style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;background-color:red;color:blue">overlay</div>');
    expect(out).not.toContain('position');
    expect(out).not.toContain('z-index');
    expect(out).not.toContain('top:0');
    expect(out).toContain('color:blue');
  });

  it('R-F11: drops a style attribute entirely when nothing in it is allowed', () => {
    const out = safeHtml('<p style="position:absolute;top:0">x</p>');
    expect(out).not.toContain('style=');
  });
});
