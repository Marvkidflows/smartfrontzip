// LOCATION: src/utils/registrationTracking.js
//
// Task 2 — client side of consent-based registration-page tracking.
//   * Nothing is sent, and no identifier is created, until the visitor clicks "Allow".
//   * The identifier is a random token kept in localStorage (never an IP/fingerprint); the server stores only its hash.
//   * A "No thanks" choice is remembered and nothing is ever sent.
// The server independently refuses to store anything unless tracking is enabled AND consent=true.

const TOKEN_KEY = 'ssi_reg_visitor';
const CHOICE_KEY = 'ssi_reg_tracking_choice';   // 'allow' | 'decline'

function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable: tracking simply stays off */ } }

export function newToken() {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export const getChoice = () => safeGet(CHOICE_KEY);

/** The token to attach to a registration submission — only ever present after the visitor allowed tracking. */
export const getConsentedToken = () => (getChoice() === 'allow' ? safeGet(TOKEN_KEY) : null);

export function decline() {
  safeSet(CHOICE_KEY, 'decline');
}

export async function allow(recordVisit) {
  let token = safeGet(TOKEN_KEY);
  if (!token) { token = newToken(); safeSet(TOKEN_KEY, token); }
  safeSet(CHOICE_KEY, 'allow');
  await recordVisit({ visitor_token: token, consent: true });
  return token;
}

/** Returning visitor who already allowed: record this page view. Silent on any failure. */
export async function recordReturningVisit(recordVisit) {
  const token = getConsentedToken();
  if (!token) return;
  try { await recordVisit({ visitor_token: token, consent: true }); } catch { /* tracking must never disturb registration */ }
}
