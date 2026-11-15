// LOCATION: src/utils/registrationResume.js
//
// Task 2 (security correction) — payload builders for the registration form and for resuming an unfinished registration.
// Resuming never sends or receives a token until the visitor proves they own the email by entering the code we emailed them
// (POST /register/resume/verify). These helpers keep the stage-1 request and the verify request built from the SAME form data.

/** The stage-1 body. The privacy fields are included only when the box was ticked, together with the policy version the user was shown. */
export function buildStage1Payload(form, { privacyAck, policyMeta, visitorToken } = {}) {
  return {
    full_name:             form.full_name,
    email:                 form.email,
    phone:                 form.phone,
    country_iso2:          form.country_iso2,
    password:              form.password,
    password_confirmation: form.password_confirmation,
    referral_code:         form.referral_code || undefined,
    visitor_token:         visitorToken || undefined,
    ...(privacyAck && policyMeta ? { privacy_policy_acknowledged: true, privacy_policy_version: policyMeta.version } : {}),
  };
}

/** The verify body: everything stage 1 carried (including the referral code: the account is created at verify time) plus the emailed code. */
export function buildResumePayload(form, code, opts = {}) {
  return { ...buildStage1Payload(form, opts), code: String(code || '').trim() };
}

/** Stage 1 now answers EVERY request with verification_required (no token, no account yet): the visitor must enter the emailed code. */
export const needsResumeVerification = (data) => data?.verification_required === true && !data?.token;

/** Is `code` a well-formed 6-digit code? */
export const isValidCode = (code) => /^\d{6}$/.test(String(code || '').trim());

/** Only plain https URLs may be rendered as links/images (mirrors the server-side filter in RegistrationPresenter::safeUrl). */
export const safeHttpsUrl = (u) => (typeof u === 'string' && /^https:\/\/[^\s<>"'\\]+$/i.test(u) ? u : null);

/**
 * How long the UI should wait before offering another code. The server is the authority (`retry_after_seconds` reflects the real per-account
 * cooldown, including after a failed or unconfirmed email); the fallback only applies if the field is missing or nonsensical.
 */
export function resumeCooldownSeconds(data, fallback = 60) {
  const n = Number(data?.retry_after_seconds);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.ceil(n), 3600) : fallback;
}
