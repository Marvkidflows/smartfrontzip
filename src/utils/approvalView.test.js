import { describe, it, expect } from 'vitest';
import { operationLabel, statusTone, statusLabel, summarizeChange, beforeAfterRows, decisionBlocker, money, reversalState } from './approvalView';

const correction = { operation: 'investment_correction', status: 'pending', is_own: false, can_decide: true, execution_attempts: 0,
  change: { kind: 'investment', before: { amount: '1000.00', profit_percentage: '10.00', expected_profit: '100.00', total_return: '1100.00' }, proposed: { amount: '2000.00', profit_percentage: '10.00' }, after: null } };

describe('approval view helpers', () => {
  it('labels operations and tolerates unknown ones', () => {
    expect(operationLabel('investment_correction')).toBe('Investment record correction');
    expect(operationLabel('mystery')).toBe('mystery');
  });
  it('colours failed and stuck as danger, pending as warning, executed as success', () => {
    expect(statusTone({ status: 'failed' })).toBe('danger');
    expect(statusTone({ status: 'executing', is_stuck: true })).toBe('danger');
    expect(statusTone({ status: 'pending' })).toBe('warning');
    expect(statusTone({ status: 'executed' })).toBe('success');
    expect(statusLabel({ status: 'failed', execution_attempts: 2 })).toBe('failed (attempt 2)');
    expect(statusLabel({ status: 'approved', is_stuck: true })).toContain('stuck');
  });
  it('shows before and proposed values for a correction, with derived values marked as recalculated on approval', () => {
    const rows = beforeAfterRows(correction);
    expect(rows[0]).toEqual({ label: 'Amount', before: '$1,000.00', after: '$2,000.00' });
    expect(rows[2].after).toBe('recalculated on approval');
    expect(summarizeChange(correction)).toContain('$1,000.00 → $2,000.00');
  });
  it('shows the executed after-values once executed', () => {
    const done = { ...correction, status: 'executed', change: { ...correction.change, after: { amount: '2000.00', profit_percentage: '10.00', expected_profit: '200.00', total_return: '2200.00' } } };
    expect(beforeAfterRows(done)[2].after).toBe('$200.00');
  });
  it('shows live and projected balance for a wallet change', () => {
    const r = { operation: 'balance_adjust', change: { kind: 'balance', type: 'deduct', amount: '15000.00', current_balance: '20000.00', projected_balance: '5000.00' } };
    expect(summarizeChange(r)).toBe('Deduct $15,000.00');
    const rows = beforeAfterRows(r);
    expect(rows.find(x => x.label.startsWith('Wallet')).after).toBe('$5,000.00');
  });
  it('explains why the requester cannot decide their own request (self-approval prevention)', () => {
    expect(decisionBlocker({ ...correction, is_own: true, can_decide: false })).toContain('different authorised person');
    expect(decisionBlocker(correction)).toBeNull();
  });
  it('explains an unauthorised role and a stuck request', () => {
    expect(decisionBlocker({ status: 'pending', can_decide: false, is_own: false })).toContain('role cannot decide');
    expect(decisionBlocker({ status: 'executing', is_stuck: true })).toContain('interrupted');
  });
  it('formats missing money as an em dash', () => { expect(money(null)).toBe('—'); });
  it('reversalState: applied and partially reversed rows can be reversed; reversed or pending ones cannot', () => {
    expect(reversalState({ status: 'applied' }).canReverse).toBe(true);
    expect(reversalState({ status: null }).canReverse).toBe(true);                         // rows from before the status column
    expect(reversalState({ status: 'partially_reversed' }).canReverse).toBe(true);
    expect(reversalState({ status: 'reversed' }).canReverse).toBe(false);
    const p = reversalState({ status: 'applied', reversal_pending_request_id: 12 });
    expect(p.canReverse).toBe(false);
    expect(p.label).toContain('#12');
  });
  it('a request flagged for manual verification explains it cannot be retried', () => {
    expect(decisionBlocker({ status: 'failed', needs_manual_verification: true, is_own: false, can_retry: false })).toContain('cannot be retried');
  });
});
