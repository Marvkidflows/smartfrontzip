// LOCATION: src/utils/lazyWithRetry.js   (NEW FILE — performance remediation)
//
// React.lazy() wrapper for route-level code splitting that survives the two failure modes lazy loading introduces:
//   1. A flaky / slow mobile connection drops one chunk request  -> retry once after a short pause.
//   2. A new deployment replaced the hashed chunk files while the visitor still has the OLD index.html open (the old chunk URL now 404s)
//      -> reload the page ONCE so the browser fetches the fresh index.html. A sessionStorage flag stops this from ever looping.
// Business logic is untouched: this only changes HOW a page module is downloaded.
import { lazy } from 'react';

export const RELOAD_FLAG = 'ssi_chunk_reload_once';

// Indirection so tests can observe a reload (window.location.reload cannot be replaced in jsdom).
export const navigation = { reload: () => window.location.reload() };

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function store() {
  try { return window.sessionStorage; } catch { return null; }   // blocked storage (private mode etc.) must never break the app
}

// Returns true when a reload was triggered (first failure this session), false when we already reloaded once.
export function reloadOnce() {
  const s = store();
  if (!s) return false;
  try {
    if (s.getItem(RELOAD_FLAG)) return false;
    s.setItem(RELOAD_FLAG, '1');
  } catch { return false; }
  navigation.reload();
  return true;
}

export function clearReloadFlag() {
  const s = store();
  try { s && s.removeItem(RELOAD_FLAG); } catch { /* ignore */ }
}

export function loadWithRetry(loader, { retries = 1, delay = 800 } = {}) {
  return async () => {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const mod = await loader();
        clearReloadFlag();
        return mod;
      } catch (err) {
        lastError = err;
        if (attempt < retries) await wait(delay * (attempt + 1));
      }
    }
    // Still failing after the retry: most likely a stale index.html after a deploy. Reload once; otherwise let the error boundary show it.
    if (reloadOnce()) return new Promise(() => {});   // page is reloading — keep the loading fallback on screen
    throw lastError;
  };
}

export default function lazyWithRetry(loader, options) {
  return lazy(loadWithRetry(loader, options));
}
