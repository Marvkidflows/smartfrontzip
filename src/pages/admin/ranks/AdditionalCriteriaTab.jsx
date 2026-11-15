import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { rankService, apiError } from '../../../services/rankService';
import { fmtDate } from './rankUtils';
import ReasonModal from './ReasonModal';

const STATUS = {
  enabled: ['In effect', 'ok'],
  enabled_but_blocked: ['Enabled but blocked', 'warn'],
  disabled_pending_management_confirmation: ['Disabled — awaiting Management confirmation', 'muted'],
};

// The five ADDITIONAL criteria. All are seeded DISABLED: SSI Management must confirm them before production use.
// Core amount + completed-cycle rules are NOT here — they stay mandatory (Rank Criteria tab).
export default function AdditionalCriteriaTab({ onChanged }) {
  const [data, setData] = useState(null);
  const [edit, setEdit] = useState(null);          // { key, values }
  const [dialog, setDialog] = useState(null);      // { type: 'enable'|'disable'|'thresholds'|'policy', crit, payload? }
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try { setData((await rankService.additionalCriteria()).data); }
    catch (e) { toast.error(apiError(e, 'Could not load the additional criteria.')); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!data) return <div className="adm-empty">Loading…</div>;

  const submit = async (reason) => {
    setBusy(true); setErr('');
    try {
      const { type, crit, payload } = dialog;
      if (type === 'enable') await rankService.additionalEnable(crit.key, { reason });
      if (type === 'disable') await rankService.additionalDisable(crit.key, { reason });
      if (type === 'thresholds') await rankService.additionalThresholds(crit.key, { thresholds: payload, reason });
      if (type === 'policy') await rankService.additionalPolicy(crit.key, { choice: payload, reason });
      toast.success('Saved and recorded in the audit history.');
      setDialog(null); setEdit(null); load(); onChanged?.();
    } catch (e) { setErr(apiError(e)); } finally { setBusy(false); }
  };

  const loadDrafts = async () => {
    try {
      const { data: r } = await rankService.loadCoreDrafts();
      toast.success(r.created.length ? `Created ${r.created.length} inactive draft(s): ${r.created.join(', ')}` : 'Every rank already has a rule — nothing created.');
      onChanged?.();
    } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div>
      <div className="rk-banner rk-banner--warn">
        <strong>Management confirmation outstanding.</strong> The specification lists these five criteria as <em>proposed</em>. They are all <strong>disabled</strong>
        and do not affect any investor until an Administrator enables them. Thresholds are kept while a criterion is disabled. Core investment-amount and completed-cycle requirements remain mandatory.
      </div>

      <div className="rk-toolbar">
        <button type="button" className="rk-btn rk-btn--sm" onClick={loadDrafts} title="Creates the six core rules from the specification as INACTIVE drafts for ranks that have no rule. Never activates anything.">
          Load core specification drafts (inactive)
        </button>
      </div>

      {data.criteria.map((c) => {
        const [label, tone] = STATUS[c.approval_status] || ['', 'muted'];
        const editing = edit?.key === c.key;
        return (
          <div key={c.key} className="adm-card" style={{ padding: 16, marginBottom: 12 }}>
            <div className="rk-run__row">
              <div>
                <strong>{c.label}</strong> <span className="rk-muted">({c.unit}{c.monetary ? ', money' : ''})</span>
                <div className="rk-muted">{c.description}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={`rk-chip rk-chip--${tone}`}>{label}</span>
                {c.enabled
                  ? <button type="button" className="rk-btn rk-btn--sm" onClick={() => { setErr(''); setDialog({ type: 'disable', crit: c }); }}>Disable</button>
                  : c.may_affect_rank === false
                    ? <span className="rk-muted">Reporting only</span>
                    : <button type="button" className="rk-btn rk-btn--primary rk-btn--sm" onClick={() => { setErr(''); setDialog({ type: 'enable', crit: c }); }}>Enable</button>}
              </div>
            </div>
            {c.blocked_reason && <div className="rk-banner rk-banner--info" style={{ marginTop: 8 }}>{c.blocked_reason}</div>}

            {c.policy && (
              <div style={{ marginTop: 8 }}>
                <div className="rk-muted">{c.policy.question}</div>
                <select className="rk-select" aria-label={`${c.label} Management decision`} value={c.policy.chosen || ''} style={{ maxWidth: 520 }}
                  onChange={(e) => e.target.value && (setErr(''), setDialog({ type: 'policy', crit: c, payload: e.target.value }))}>
                  <option value="">— Management has not decided —</option>
                  {Object.entries(c.policy.options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                {c.policy.set_at && <span className="rk-muted"> recorded {fmtDate(c.policy.set_at)}</span>}
              </div>
            )}

            <div className="rk-table-wrap" style={{ marginTop: 10 }}>
              <table className="rk-table" style={{ minWidth: 520 }}>
                <thead><tr>{data.ranks.map((r) => <th key={r.key}>{r.name}</th>)}</tr></thead>
                <tbody><tr>
                  {data.ranks.map((r) => (
                    <td key={r.key}>
                      {editing
                        ? <input className="rk-input" type="number" min="0" aria-label={`${c.label} ${r.name}`} style={{ width: 90 }}
                            value={edit.values[r.key] ?? ''} onChange={(e) => setEdit({ ...edit, values: { ...edit.values, [r.key]: e.target.value } })} />
                        : Number(c.thresholds[r.key]).toLocaleString()}
                    </td>
                  ))}
                </tr></tbody>
              </table>
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              {!editing && <button type="button" className="rk-btn rk-btn--sm" onClick={() => setEdit({ key: c.key, values: { ...c.thresholds } })}>Edit thresholds</button>}
              {editing && <>
                <button type="button" className="rk-btn rk-btn--primary rk-btn--sm" onClick={() => { setErr(''); setDialog({ type: 'thresholds', crit: c, payload: edit.values }); }}>Save…</button>
                <button type="button" className="rk-btn rk-btn--sm" onClick={() => setEdit(null)}>Cancel</button>
              </>}
            </div>
          </div>
        );
      })}

      <h3>Configuration history</h3>
      <div className="rk-table-wrap">
        <table className="rk-table">
          <thead><tr><th>When</th><th>Criterion</th><th>Action</th><th>By</th><th>Reason</th></tr></thead>
          <tbody>
            {data.history.length === 0 && <tr><td colSpan={5} className="rk-muted">No changes yet.</td></tr>}
            {data.history.map((h) => (
              <tr key={h.id}><td className="rk-muted">{fmtDate(h.created_at)}</td><td>{h.criterion_key}</td><td>{h.action.replace('_', ' ')}</td>
                <td>{h.actor_name}{h.actor_role ? ` (${h.actor_role})` : ''}</td><td>{h.reason}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      {dialog && (
        <ReasonModal
          title={{ enable: `Enable “${dialog.crit.label}”`, disable: `Disable “${dialog.crit.label}”`, thresholds: `Change ${dialog.crit.label} thresholds`, policy: 'Record Management decision' }[dialog.type]}
          intro={dialog.type === 'enable' ? 'From now on this criterion is required for every rank and investors are re-evaluated. Nobody is downgraded automatically; investors who no longer meet their rank are flagged under Reviews.'
            : dialog.type === 'disable' ? 'The criterion stops affecting eligibility. Its thresholds are kept.' : 'Recorded in the audit history.'}
          confirmLabel="Confirm" danger={dialog.type === 'disable'} busy={busy} error={err} onConfirm={submit} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}
