// LOCATION: src/utils/approvalView.js — pure presentation helpers for the Approvals inbox (no React, no network; unit-testable).

export const OPERATION_LABELS = {
  balance_adjust: 'Balance adjustment',
  bulk_balance: 'Bulk balance operation',
  profit_adjust: 'Profit rate adjustment',
  profit_reverse: 'Profit adjustment reversal',
  investment_correction: 'Investment record correction',
};
export const operationLabel = (op) => OPERATION_LABELS[op] || String(op || 'Unknown operation');

export const STATUS_FILTERS = [
  { value: 'open', label: 'Open (pending + failed)' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'stuck', label: 'Stuck (needs recovery)' },
  { value: 'executed', label: 'Executed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'expired', label: 'Expired' },
  { value: 'all', label: 'All' },
];

/** badge-* tone for a request, taking the stuck/expired flags into account */
export function statusTone(req) {
  if (!req) return 'info';
  if (req.is_stuck || req.status === 'failed') return 'danger';
  if (req.status === 'executed') return 'success';
  if (req.status === 'pending') return 'warning';
  return 'info';                                   // rejected / cancelled / expired
}

export function statusLabel(req) {
  if (!req) return '';
  if (req.is_stuck) return 'stuck — needs recovery';
  if (req.status === 'failed') return `failed (attempt ${req.execution_attempts || 1})`;
  return req.status;
}

export const money = (v) => (v === null || v === undefined || v === '' ? '—' : `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const pct = (v) => (v === null || v === undefined || v === '' ? '—' : `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`);

/** One-line description used in the list. */
export function summarizeChange(req) {
  const c = req?.change || {};
  if (c.kind === 'balance') {
    const verb = { add: 'Add', deduct: 'Deduct', reset: 'Reset to $0.00', freeze: 'Freeze account', unfreeze: 'Unfreeze account' }[c.type] || c.type;
    return ['add', 'deduct'].includes(c.type) ? `${verb} ${money(c.amount)}` : verb;
  }
  if (c.kind === 'investment') {
    const p = c.proposed || {}, b = c.before || {};
    return `Amount ${money(b.amount)} → ${money(p.amount)}, rate ${pct(b.profit_percentage)} → ${pct(p.profit_percentage)}`;
  }
  if (c.kind === 'profit') {
    const d = c.details || {};
    return `${d.percentage_change > 0 ? '+' : ''}${d.percentage_change ?? '?'}% on ${c.scope || 'scope'}`;
  }
  if (c.kind === 'bulk') {
    const d = c.details || {};
    return `${d.type === 'deduct' ? 'Deduct' : 'Credit'} ${d.amount_type === 'percentage' ? pct(d.amount) : money(d.amount)} · ${d.scope || ''}`.trim();
  }
  return operationLabel(req?.operation);
}

/** @returns {{label:string, before:string, after:string}[]} the before/after table for the detail view */
export function beforeAfterRows(req) {
  const c = req?.change || {};
  if (c.kind === 'balance') {
    const rows = [{ label: 'Wallet balance (live)', before: money(c.current_balance), after: money(c.projected_balance) }];
    if (['add', 'deduct'].includes(c.type)) rows.unshift({ label: c.type === 'add' ? 'Credit' : 'Deduction', before: '—', after: money(c.amount) });
    return rows;
  }
  if (c.kind === 'investment') {
    const b = c.before || {}, p = c.proposed || {}, a = c.after || null;
    const afterOr = (k, proposed) => (a ? a[k] : proposed);
    return [
      { label: 'Amount', before: money(b.amount), after: money(afterOr('amount', p.amount)) },
      { label: 'Profit rate', before: pct(b.profit_percentage), after: pct(afterOr('profit_percentage', p.profit_percentage)) },
      { label: 'Expected profit', before: money(b.expected_profit), after: a ? money(a.expected_profit) : 'recalculated on approval' },
      { label: 'Total return', before: money(b.total_return), after: a ? money(a.total_return) : 'recalculated on approval' },
    ];
  }
  const d = c.details || {};
  return Object.keys(d).map((k) => ({ label: k.replace(/_/g, ' '), before: '—', after: typeof d[k] === 'object' ? JSON.stringify(d[k]) : String(d[k]) }));
}

/** Why the current user cannot decide a request (shown instead of buttons). null = they can, or nothing to explain. */
export function decisionBlocker(req) {
  if (!req) return null;
  if (req.needs_manual_verification) return 'This request was interrupted and its execution state could not be determined. Verify the affected records manually, then cancel it and submit a new request if still needed. It cannot be retried.';
  if (req.is_own && ['pending', 'failed'].includes(req.status)) return 'You submitted this request. A different authorised person must approve or reject it.';
  if (req.status === 'pending' && !req.can_decide && !req.is_own) return 'Your role cannot decide this type of request.';
  if (req.is_stuck) return 'This request was interrupted. An administrator must run recovery (php artisan ssi:approvals-maintain) before it can be retried.';
  return null;
}

/** Reversal state of a profit-adjustment history row (R4). `status` is applied | partially_reversed | reversed (older rows: null ⇒ applied). */
export function reversalState(h) {
  if (!h) return { canReverse: false, label: '', tone: 'info' };
  const status = h.status || 'applied';
  if (h.reversal_pending_request_id) return { canReverse: false, label: `Reversal pending (#${h.reversal_pending_request_id})`, tone: 'warning' };
  if (status === 'reversed') return { canReverse: false, label: 'Reversed', tone: 'info' };
  if (status === 'partially_reversed') return { canReverse: true, label: 'Partially reversed', tone: 'warning' };
  return { canReverse: true, label: 'Applied', tone: 'success' };
}
