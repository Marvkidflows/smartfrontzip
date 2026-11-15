// LOCATION: src/utils/registrationResume.test.js — Task 2 security correction: frontend side of the resume flow.
import { describe, it, expect } from 'vitest';
import { buildStage1Payload, buildResumePayload, needsResumeVerification, isValidCode, safeHttpsUrl, resumeCooldownSeconds } from './registrationResume';

const form = { full_name: 'Ada', email: 'ada@example.com', phone: '2015550123', country_iso2: 'US', password: 'Secret-123', password_confirmation: 'Secret-123', referral_code: 'ABC12345' };

describe('resume payloads', () => {
  it('stage-1 payload carries the form and omits privacy fields unless acknowledged', () => {
    const p = buildStage1Payload(form, { visitorToken: 'tok-1234567890abcdef' });
    expect(p.email).toBe('ada@example.com');
    expect(p.referral_code).toBe('ABC12345');
    expect(p.visitor_token).toBe('tok-1234567890abcdef');
    expect('privacy_policy_acknowledged' in p).toBe(false);
    const q = buildStage1Payload(form, { privacyAck: true, policyMeta: { version: 'v7' } });
    expect(q.privacy_policy_acknowledged).toBe(true);
    expect(q.privacy_policy_version).toBe('v7');
  });
  it('verify payload is the same data (including the referral code, because the account is created at verify) plus the code', () => {
    const p = buildResumePayload(form, ' 123456 ', { privacyAck: true, policyMeta: { version: 'v7' } });
    expect(p.code).toBe('123456');
    expect(p.email).toBe('ada@example.com');
    expect(p.password).toBe('Secret-123');
    expect(p.privacy_policy_version).toBe('v7');
    expect(p.referral_code).toBe('ABC12345');   // contract change: the account is now created by /register/verify, so attribution must travel with it
  });
});

describe('resume detection', () => {
  it('treats verification_required without a token as a resume challenge', () => {
    expect(needsResumeVerification({ success: true, verification_required: true })).toBe(true);
  });
  it('never treats a response that carries a token as a challenge (normal new registration)', () => {
    expect(needsResumeVerification({ success: true, token: 'abc', email_sent: true })).toBe(false);
    expect(needsResumeVerification({ verification_required: true, token: 'abc' })).toBe(false);
    expect(needsResumeVerification(undefined)).toBe(false);
  });
  it('validates the 6-digit code shape', () => {
    expect(isValidCode('123456')).toBe(true);
    ['12345', '1234567', 'abcdef', '', null, '12 456'].forEach(c => expect(isValidCode(c)).toBe(false));
  });
});

describe('safeHttpsUrl', () => {
  it('allows plain https URLs only', () => {
    expect(safeHttpsUrl('https://res.cloudinary.com/demo/id.jpg')).toBe('https://res.cloudinary.com/demo/id.jpg');
    ['javascript:alert(1)', 'data:text/html,x', 'http://a.b/c', 'https://a.b/c d', 'https://a.b/"x', null, undefined, 42].forEach(u => expect(safeHttpsUrl(u)).toBeNull());
  });
});

describe('resumeCooldownSeconds', () => {
  it('follows the server-provided wait, rounded up and capped at one hour', () => {
    expect(resumeCooldownSeconds({ retry_after_seconds: 42 })).toBe(42);
    expect(resumeCooldownSeconds({ retry_after_seconds: 12.2 })).toBe(13);
    expect(resumeCooldownSeconds({ retry_after_seconds: 999999 })).toBe(3600);
  });
  it('falls back when the field is missing or nonsensical', () => {
    [undefined, {}, { retry_after_seconds: 0 }, { retry_after_seconds: -5 }, { retry_after_seconds: 'abc' }].forEach(d => expect(resumeCooldownSeconds(d, 60)).toBe(60));
    expect(resumeCooldownSeconds({}, 30)).toBe(30);
  });
});
