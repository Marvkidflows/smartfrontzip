import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import RankBadge from './RankBadge';
import { rankService, apiError } from '../services/rankService';
import { STATUS_CHIP } from '../pages/admin/ranks/rankUtils';
import ReasonModal from '../pages/admin/ranks/ReasonModal';

const fmt = (v) => (v === null || v === undefined ? '—' : Number.isNaN(Number(v)) ? String(v) : Number(v).toLocaleString());
const APPROVAL_LABEL = {
  enabled: 'Enabled', enabled_but_blocked: 'Enabled — blocked',
  disabled_pending_management_confirmation: 'Disabled — awaiting Management confirmation',
};

// Calculated eligibility (kept SEPARATE from the assigned rank): for the selected rank, every core and additional
// requirement with its threshold, the investor's verified value, whether it is met, whether it is enabled, and any
// outstanding approval status. Also the Admin-only suspend / revoke / reinstate actions.
export default function RankEligibilityPanel({ investorId, scope = 'admin', onChanged }) {
  const [data, setData] = useState(null);
  const [sel, setSel] = useState(null);
  const [dialog, setDialog] = useState(null);   // 'suspend' | 'revoke' | 'reinstate'
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const { data: d } = await rankService.eligibility(investorId, scope);
      setData(d);
      setSel((cur) => cur || d.calculated_rank?.key || d.ranks.find((r) => r.rank.level > (d.assigned_rank?.level || 0))?.rank.key || d.ranks[0]?.rank.key);
    } catch (e) { toast.error(apiError(e, 'Could not load eligibility.')); }
  }, [investorId, scope]);
  useEffect(() => { load(); }, [load]);

  if (!data) return <div className="adm-card" style={{ padding: 16, marginBottom: 12 }}>Loading eligibility…</div>;

  const row = data.ranks.find((r) => r.rank.key === sel) || data.ranks[0];
  const [chipLabel, chipTone] = STATUS_CHIP[data.rank_status] || STATUS_CHIP.active;

  const act = async (reason) => {
    setBusy(true); setErr('');
    try {
      const call = { suspend: rankService.suspendRank, revoke: rankService.revokeRank, reinstate: rankService.reinstateRank }[dialog];
      await call(investorId, { reason });
      toast.success('Rank status updated.'); setDialog(null); load(); onChanged?.();
    } catch (e) { setErr(apiError(e)); } finally { setBusy(false); }
  };

  const rows = [
    ...row.core.conditions.map((c) => ({ ...c, kind: 'Core (mandatory)', status: row.rule_state === 'active' ? 'Active rule' : row.rule_state })),
    ...row.additional.map((c) => ({ ...c, kind: 'Additional', status: APPROVAL_LABEL[c.approval_status] || c.approval_status, mandatory: false })),
  ];

  return (
    <div className="adm-card" style={{ padding: 16, marginBottom: 12 }}>
      <h3 style={{ marginTop: 0 }}>Eligibility &amp; rank status</h3>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        <div><div className="rk-muted">Assigned rank (authorised)</div><RankBadge rank={data.assigned_rank} size="md" /> <span className={`rk-chip rk-chip--${chipTone}`}>{chipLabel}</span></div>
        <div><div className="rk-muted">Calculated eligibility</div><RankBadge rank={data.calculated_rank} size="md" /></div>
        <div><div className="rk-muted">Pending approval</div>{data.pending_review
          ? <><RankBadge rank={data.pending_review.proposed_rank} size="sm" /> <span className="rk-chip rk-chip--warn">awaiting decision</span></> : <span className="rk-muted">None</span>}</div>
      </div>

      {scope === 'admin' && data.assigned_rank && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {data.rank_status === 'active' && <button type="button" className="rk-btn rk-btn--sm" onClick={() => { setErr(''); setDialog('suspend'); }}>Suspend rank</button>}
          {data.rank_status !== 'revoked' && <button type="button" className="rk-btn rk-btn--danger rk-btn--sm" onClick={() => { setErr(''); setDialog('revoke'); }}>Revoke rank</button>}
          {data.rank_status !== 'active' && <button type="button" className="rk-btn rk-btn--primary rk-btn--sm" onClick={() => { setErr(''); setDialog('reinstate'); }}>Reinstate rank</button>}
        </div>
      )}

      <div className="rk-toolbar">
        <label className="rk-muted" htmlFor="rk-elig-rank">Show requirements for</label>
        <select id="rk-elig-rank" className="rk-select" value={row.rank.key} onChange={(e) => setSel(e.target.value)} style={{ maxWidth: 200 }}>
          {data.ranks.map((r) => <option key={r.rank.key} value={r.rank.key}>{r.rank.name}{r.qualifies ? ' ✔' : ''}</option>)}
        </select>
        <span className={`rk-chip rk-chip--${row.qualifies ? 'ok' : 'bad'}`}>{row.qualifies ? 'Qualifies' : 'Does not qualify'}</span>
      </div>

      <div className="rk-table-wrap">
        <table className="rk-table">
          <thead><tr><th>Requirement</th><th>Type</th><th>Required</th><th>Verified value</th><th>Met</th><th>Enabled</th><th>Approval status</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="rk-muted">No requirements configured for this rank.</td></tr>}
            {rows.map((c, i) => (
              <tr key={i}>
                <td>{c.label}{c.provisional && <span className="rk-chip rk-chip--warn" title="Management has not chosen how this is measured; value is provisional"> provisional</span>}</td>
                <td>{c.kind}</td>
                <td>≥ {fmt(c.expected)}{c.unit ? ` ${c.unit}` : ''}</td>
                <td>{fmt(c.actual)}{c.unit ? ` ${c.unit}` : ''}</td>
                <td>{c.passed ? <span className="rk-chip rk-chip--ok">Met</span> : <span className={`rk-chip rk-chip--${c.enabled === false ? 'muted' : 'bad'}`}>Not met</span>}</td>
                <td>{c.enabled === false ? 'Disabled' : 'Enabled'}</td>
                <td className="rk-muted">{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {row.unmet.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <strong>Why this investor does not qualify for {row.rank.name}:</strong>
          <ul style={{ margin: '4px 0 0 18px', fontSize: '0.85rem' }}>{row.unmet.map((u, i) => <li key={i}>{u}</li>)}</ul>
        </div>
      )}
      <div className="rk-muted" style={{ marginTop: 8 }}>
        Disabled additional criteria are shown for information and do not affect eligibility. Money values use verified USD only.
      </div>

      {dialog && (
        <ReasonModal
          title={{ suspend: 'Suspend rank', revoke: 'Revoke rank', reinstate: 'Reinstate rank' }[dialog]}
          intro={{ suspend: 'The badge is hidden while suspended. No financial record is changed.', revoke: 'The badge is removed. No financial record is changed.', reinstate: 'The badge is shown again if the investor still qualifies (otherwise an authorised override is required).' }[dialog]}
          confirmLabel={{ suspend: 'Suspend', revoke: 'Revoke', reinstate: 'Reinstate' }[dialog]} danger={dialog === 'revoke'}
          busy={busy} error={err} onConfirm={act} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}
