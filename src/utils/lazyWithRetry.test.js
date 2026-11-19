// LOCATION: src/utils/lazyWithRetry.test.js   (NEW FILE — performance remediation)
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadWithRetry, reloadOnce, navigation, RELOAD_FLAG } from './lazyWithRetry';

let reload;
beforeEach(() => {
  sessionStorage.clear();
  reload = vi.spyOn(navigation, 'reload').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); });

describe('loadWithRetry', () => {
  it('returns the module on the first success without reloading', async () => {
    const mod = { default: () => null };
    await expect(loadWithRetry(async () => mod)()).resolves.toBe(mod);
    expect(reload).not.toHaveBeenCalled();
  });

  it('retries once after a transient failure', async () => {
    const mod = { default: () => null };
    const loader = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(mod);
    await expect(loadWithRetry(loader, { retries: 1, delay: 1 })()).resolves.toBe(mod);
    expect(loader).toHaveBeenCalledTimes(2);
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads the page once when the chunk is still missing (stale deploy), and never loops', async () => {
    const loader = vi.fn().mockRejectedValue(new Error('Failed to fetch dynamically imported module'));
    // first failure: reload is requested and the promise stays pending so the fallback remains on screen
    const first = loadWithRetry(loader, { retries: 1, delay: 1 })();
    const settled = await Promise.race([first.then(() => 'resolved', () => 'rejected'), new Promise((r) => setTimeout(() => r('pending'), 50))]);
    expect(settled).toBe('pending');
    expect(reload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(RELOAD_FLAG)).toBe('1');
    // second failure in the same session: no further reload, the error reaches the error boundary
    await expect(loadWithRetry(loader, { retries: 1, delay: 1 })()).rejects.toThrow('Failed to fetch dynamically imported module');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('clears the reload flag after a successful load so a later deploy can recover again', async () => {
    sessionStorage.setItem(RELOAD_FLAG, '1');
    await loadWithRetry(async () => ({ default: () => null }))();
    expect(sessionStorage.getItem(RELOAD_FLAG)).toBeNull();
  });
});

describe('reloadOnce', () => {
  it('reloads only the first time', () => {
    expect(reloadOnce()).toBe(true);
    expect(reloadOnce()).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
