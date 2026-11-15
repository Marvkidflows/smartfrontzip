export const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export const CHANGE_LABELS = {
  automatic_upgrade:   'Automatic upgrade',
  manual_assignment:   'Manual assignment',
  manual_upgrade:      'Manual upgrade',
  downgrade:           'Manual downgrade',
  authorized_override: 'Authorized override',
  review_retained:     'Review: rank retained',
  approved_upgrade:    'Approved upgrade',
  suspended:           'Rank suspended',
  revoked:             'Rank revoked',
  reinstated:          'Rank reinstated',
};

export const STATUS_CHIP = { active: ['Active', 'ok'], suspended: ['Suspended', 'warn'], revoked: ['Revoked', 'bad'] };

export const ACTION_LABELS = {
  created: 'Created', updated: 'Edited', activated: 'Activated', deactivated: 'Deactivated', archived: 'Removed',
};

export const RUN_STATUS = {
  pending:               { label: 'Pending',               tone: 'warn' },
  running:               { label: 'Running',               tone: 'info' },
  completed:             { label: 'Completed',             tone: 'ok'   },
  completed_with_errors: { label: 'Completed with errors', tone: 'warn' },
  failed:                { label: 'Failed',                tone: 'bad'  },
};

function fmtVal(v) {
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') return Number(v).toLocaleString();
  if (v !== null && v !== '' && !Number.isNaN(Number(v)) && typeof v === 'string') return Number(v).toLocaleString();
  return String(v ?? '—');
}

export function formatValue(value) {
  if (Array.isArray(value)) return value.map(fmtVal).join(' – ');
  return fmtVal(value);
}

// "Total invested amount ≥ 5,000 USD" — built from the backend schema so labels
// and units are never hardcoded here.
export function describeCondition(c, schema) {
  const f = schema?.fields?.find((x) => x.key === c.field);
  const op = schema?.operators?.find((x) => x.key === c.operator);
  const unit = f?.unit ? ` ${f.unit}` : '';
  const val = Array.isArray(c.value) && f?.type === 'enum' ? c.value.join(', ') : formatValue(c.value);
  return `${f?.label ?? c.field} ${op?.symbol ?? c.operator} ${val}${unit}`;
}

export function describeRule(snapshot, schema) {
  if (!snapshot?.conditions?.length) return '—';
  const join = snapshot.logic === 'any' ? ' OR ' : ' AND ';
  if (snapshot.logic === 'grouped') {
    const groups = {};
    snapshot.conditions.forEach((c) => { (groups[c.group_no] ||= []).push(describeCondition(c, schema)); });
    return Object.values(groups).map((g) => `(${g.join(' AND ')})`).join(' OR ');
  }
  return snapshot.conditions.map((c) => describeCondition(c, schema)).join(join);
}
