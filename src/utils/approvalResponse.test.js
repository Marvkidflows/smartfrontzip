import { describe, it, expect, vi } from 'vitest';
import { PENDING_MESSAGE, interpretAdjustmentResponse, pendingText, notifyAdjustmentResult, adjustmentErrorMessage } from './approvalResponse';

const mkToast = () => { const t = vi.fn(); t.success = vi.fn(); t.error = vi.fn(); return t; };

describe('interpretAdjustmentResponse (R4: 200 vs 202)', () => {
  it('treats HTTP 200 as completed', () => {
    const i = interpretAdjustmentResponse({ status: 200, data: { message: 'Balance added.' } });
    expect(i.pending).toBe(false);
    expect(i.message).toBe('Balance added.');
  });
  it('treats HTTP 202 as pending with the fixed message, id and status', () => {
    const i = interpretAdjustmentResponse({ status: 202, data: { message: 'server text', approval_request_id: 41, status: 'pending' } });
    expect(i.pending).toBe(true);
    expect(i.requestId).toBe(41);
    expect(i.status).toBe('pending');
    expect(i.message).toBe(PENDING_MESSAGE);
  });
  it('treats pending_approval:true as pending even if the status code were lost', () => {
    expect(interpretAdjustmentResponse({ status: 200, data: { pending_approval: true } }).pending).toBe(true);
  });
  it('flags a duplicate pending request', () => {
    expect(interpretAdjustmentResponse({ status: 202, data: { approval_request_id: 3, duplicate: true } }).duplicate).toBe(true);
  });
});

describe('notifyAdjustmentResult never claims completion for a pending request', () => {
  it('shows a success toast only for 200', () => {
    const t = mkToast();
    notifyAdjustmentResult(t, { status: 200, data: { message: 'Done.' } }, 'fallback');
    expect(t.success).toHaveBeenCalledWith('Done.');
    expect(t).not.toHaveBeenCalled();
  });
  it('for 202 shows the awaiting-approval text with the request id and NO success toast', () => {
    const t = mkToast();
    notifyAdjustmentResult(t, { status: 202, data: { approval_request_id: 9, status: 'pending', message: 'Adjustment applied' } }, 'Adjustment applied');
    expect(t.success).not.toHaveBeenCalled();
    const text = t.mock.calls[0][0];
    expect(text).toContain('Request submitted and awaiting approval.');
    expect(text).toContain('Request #9');
    expect(text).not.toContain('applied');
  });
  it('pendingText mentions a duplicate', () => {
    expect(pendingText({ requestId: 2, status: 'pending', duplicate: true })).toContain('already pending');
  });
});

describe('adjustmentErrorMessage', () => {
  it('uses the first validation error on 422', () => {
    expect(adjustmentErrorMessage({ response: { status: 422, data: { message: 'x', errors: { amount: ['Cannot deduct more than the current balance.'] } } } })).toBe('Cannot deduct more than the current balance.');
  });
  it('explains 403 and 409', () => {
    expect(adjustmentErrorMessage({ response: { status: 403, data: {} } })).toContain('not authorised');
    expect(adjustmentErrorMessage({ response: { status: 409, data: {} } })).toContain('conflicts');
  });
  it('falls back for network errors', () => {
    expect(adjustmentErrorMessage({}, 'Boom')).toBe('Boom');
  });
});
