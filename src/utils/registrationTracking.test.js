// LOCATION: src/utils/registrationTracking.test.js — Task 2: consent rules of the client-side visit tracking.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { allow, decline, getChoice, getConsentedToken, recordReturningVisit, newToken } from './registrationTracking';

beforeEach(() => localStorage.clear());

describe('registration tracking consent', () => {
  it('creates no identifier and sends nothing before the visitor chooses', async () => {
    const send = vi.fn();
    await recordReturningVisit(send);
    expect(send).not.toHaveBeenCalled();
    expect(getChoice()).toBeNull();
    expect(getConsentedToken()).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it('declining stores only the choice, never a token, and nothing is ever sent', async () => {
    const send = vi.fn();
    decline();
    await recordReturningVisit(send);
    expect(send).not.toHaveBeenCalled();
    expect(getConsentedToken()).toBeNull();
    expect(localStorage.getItem('ssi_reg_visitor')).toBeNull();
  });

  it('allowing sends consent=true with a stable random token', async () => {
    const send = vi.fn().mockResolvedValue({});
    const token = await allow(send);
    expect(send).toHaveBeenCalledWith({ visitor_token: token, consent: true });
    expect(token).toMatch(/^[A-Za-z0-9-]{16,64}$/);
    expect(getConsentedToken()).toBe(token);

    await recordReturningVisit(send);
    expect(send).toHaveBeenLastCalledWith({ visitor_token: token, consent: true });
    expect(await allow(send)).toBe(token);   // same visitor keeps the same token
  });

  it('a failing tracking request never throws into registration', async () => {
    await allow(vi.fn().mockResolvedValue({}));
    await expect(recordReturningVisit(vi.fn().mockRejectedValue(new Error('offline')))).resolves.toBeUndefined();
  });

  it('tokens are random and match the server format rule', () => {
    const a = newToken(), b = newToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9-]{16,64}$/);
  });
});
