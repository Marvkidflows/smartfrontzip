// LOCATION: src/utils/registrationStatus.test.js — Task 2 frontend unit tests.
import { describe, it, expect } from 'vitest';
import { STATUS_ORDER, STATUS_META, statusLabel, statusBadge, eventLabel, isRegistrationRole } from './registrationStatus';

describe('registration statuses', () => {
  it('covers exactly the six required statuses with the required labels', () => {
    expect([...STATUS_ORDER].sort()).toEqual(['additional_info_required', 'approved', 'pending', 'rejected', 'submitted', 'under_review']);
    expect(statusLabel('additional_info_required')).toBe('Additional Information Required');
    expect(statusLabel('under_review')).toBe('Under Review');
    STATUS_ORDER.forEach(s => expect(STATUS_META[s].badge).toBeTruthy());
  });
  it('falls back safely for unknown values', () => {
    expect(statusLabel('weird')).toBe('weird');
    expect(statusLabel(null)).toBe('—');
    expect(statusBadge('weird')).toBe('badge badge-warning');
  });
  it('labels events and falls back to the raw type', () => {
    expect(eventLabel('kyc_submitted')).toBe('Submitted KYC documents');
    expect(eventLabel('future_event')).toBe('future_event');
  });
  it('recognises only registration roles', () => {
    expect(isRegistrationRole('registration_member')).toBe(true);
    expect(isRegistrationRole('registration_lead')).toBe(true);
    ['admin', 'financial', 'marvflow_member', 'investor', undefined].forEach(r => expect(isRegistrationRole(r)).toBe(false));
  });
});
