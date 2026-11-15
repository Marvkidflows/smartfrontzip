import { describe, it, expect } from 'vitest';
import { sanitizeStyle, isSafeStyle } from './safeHtml';

describe('sanitizeStyle — property allowlist (R-F11)', () => {
  it('keeps ordinary formatting', () => {
    expect(sanitizeStyle('color:#ff0000;text-align:center')).toBe('color:#ff0000;text-align:center');
    expect(sanitizeStyle('font-size: 14px; font-weight: 700')).toBe('font-size:14px;font-weight:700');
  });
  it('drops positioning / overlay properties but keeps the harmless ones next to them', () => {
    expect(sanitizeStyle('position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;color:red')).toBe('width:100%;height:100%;color:red');
    for (const p of ['position:absolute', 'position:fixed', 'z-index:1', 'top:0', 'inset:0', 'display:none', 'float:left', 'overflow:visible', 'transform:scale(9)', 'opacity:0', 'pointer-events:none', 'cursor:pointer', 'filter:blur(2px)']) {
      expect(sanitizeStyle(p)).toBe('');
    }
  });
  it('rejects url(), expression(), escapes, comments, @import in any form', () => {
    for (const bad of ['background-color:url(javascript:alert(1))', 'width:expression(alert(1))', 'color:\\72ed', 'color:red/*x*/', '@import "x"', 'color:red;background:url(x)', 'color:javascript:x']) {
      expect(sanitizeStyle(bad)).toBe('');
    }
  });
  it('isSafeStyle is true only when nothing would be dropped', () => {
    expect(isSafeStyle('color:red')).toBe(true);
    expect(isSafeStyle('color:red;')).toBe(true);
    expect(isSafeStyle('color:red;position:fixed')).toBe(false);
    expect(isSafeStyle('background:url(x)')).toBe(false);
    expect(isSafeStyle('')).toBe(false);
  });
});
