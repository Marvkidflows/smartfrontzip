import { describe, it, expect } from 'vitest';
import { isAccountRestricted, stashAuthNotice, consumeAuthNotice } from './sessionNotice';

const memory = () => { const m = new Map(); return { setItem: (k, v) => m.set(k, v), getItem: (k) => (m.has(k) ? m.get(k) : null), removeItem: (k) => m.delete(k) }; };

describe('session notice (R9)', () => {
  it('recognises only a 403 with code account_restricted', () => {
    expect(isAccountRestricted({ response: { status: 403, data: { code: 'account_restricted' } } })).toBe(true);
    expect(isAccountRestricted({ response: { status: 403, data: { message: 'x' } } })).toBe(false);
    expect(isAccountRestricted({ response: { status: 401, data: { code: 'account_restricted' } } })).toBe(false);
    expect(isAccountRestricted({})).toBe(false);
  });
  it('stores a notice and returns it exactly once', () => {
    const s = memory();
    stashAuthNotice('Your staff account is frozen.', s);
    expect(consumeAuthNotice(s)).toBe('Your staff account is frozen.');
    expect(consumeAuthNotice(s)).toBe(null);
  });
  it('falls back to a default message and never throws without storage', () => {
    const s = memory();
    stashAuthNotice('', s);
    expect(consumeAuthNotice(s)).toContain('restricted');
    expect(consumeAuthNotice(null)).toBe(null);
  });
});
