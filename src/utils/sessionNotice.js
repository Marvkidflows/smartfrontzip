// LOCATION: src/utils/sessionNotice.js
// R9: when the server ends a STAFF session because the account is no longer active (403 code=account_restricted; the token is revoked), the client
// must end the session too and tell the person why — otherwise they sit in a half-logged-in UI where every call errors.
const KEY = 'auth_notice';

export const isAccountRestricted = (err) => err?.response?.status === 403 && err?.response?.data?.code === 'account_restricted';

export function stashAuthNotice(message, storage = (typeof sessionStorage !== 'undefined' ? sessionStorage : null)) {
  try { storage?.setItem(KEY, String(message || 'Your account is restricted. Please contact your administrator.')); } catch { /* storage unavailable: the redirect still happens */ }
}

/** Returns the pending notice once, then forgets it. */
export function consumeAuthNotice(storage = (typeof sessionStorage !== 'undefined' ? sessionStorage : null)) {
  try { const m = storage?.getItem(KEY) || null; if (m) storage.removeItem(KEY); return m; } catch { return null; }
}
