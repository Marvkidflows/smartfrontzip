import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import RankBadge from './RankBadge';
import { rankService, apiError } from '../services/rankService';
import { fmtDate } from '../pages/admin/ranks/rankUtils';
import ReasonModal from '../pages/admin/ranks/ReasonModal';
import '../pages/admin/AdminPages.css';
import '../pages/admin/ranks/AdminRanks.css';

const TONE = { pending: 'warn', approved: 'ok', rejected: 'bad', withdrawn: 'muted' };

// Calculated eligibility waiting for an authorised decision. Used by BOTH the Admin and the Financial Team screens
// (scope = 'admin' | 'financial'). Nothing here awards a rank by itself: the server re-validates eligibility on approval.
export default function RankApprovalsPanel({ scope = 'admin', onChanged }) {
  const [status, setStatus] = useState('pending');
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ approval_required: true });
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null);   // { kind: 'approve' | 'reject', row }
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await rankService.approvals({ status }, scope);
      setRows(data.data); setMeta({ approval_required: data.approval_required, pending_count: data.pending_count });
    } catch (e) { toast.error(apiError(e, 'Could not load rank approvals.')); }
    finally { setLoading(false); }
  }, [status, scope]);
  useEffect(() => { load(); }, [load]);

  const decide = async (reason) => {
    setBusy(true); setErr('');
    try {
      if (dialog.kind === 'approve') await rankService.approve(dialog.row.id, { note: reason || undefined }, scope);
      else await rankService.rejectReview(dialog.row.id, { reason }, scope);
      toast.success(dialog.kind === 'approve' ? 'Rank approved and awarded.' : 'Rank review rejected.');
      setDialog(null); load(); onChanged?.();
    } catch (e) { setErr(apiError(e)); } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="rk-banner rk-banner--info">
        The system <strong>calculates</strong> eligibility; a rank is only <strong>awarded</strong> when an authorised Administration or Financial Team member approves it here.
        Pending items are never shown to investors as a rank. {!meta.approval_required && <strong> Approval is currently switched off by configuration (RANKS_REQUIRE_APPROVAL=false).</strong>}
      </div>
      <div className="rk-toolbar">
        <select className="rk-select" aria-label="Approval status" value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 220 }}>
          <option value="pending">Awaiting decision</option><option value="approved">Approved</option>
          <option value="rejected">Rejected</option><option value="withdrawn">Withdrawn (no longer eligible)</option><option value="all">All</option>
        </select>
      </div>

      {loading && <div className="adm-empty">Loading…</div>}
      {!loading && rows.length === 0 && <div className="adm-empty">Nothing here.</div>}
      {rows.map((r) => (
        <div key={r.id} className="rk-run">
          <div className="rk-run__row">
            <div style={{ minWidth: 0 }}>
              <strong style={{ overflowWrap: 'anywhere' }}>{r.investor_name}</strong> <span className="rk-mono rk-muted">{r.account_id}</span>
              <span className="rk-mono rk-muted"> · {r.reference}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <RankBadge rank={r.current_rank} size="sm" /> → <RankBadge rank={r.proposed_rank} size="sm" />
              <span className={`rk-chip rk-chip--${TONE[r.status] || 'muted'}`}>{r.status}</span>
            </div>
          </div>
          <div className="rk-muted">Requirements at calculation time:</div>
          <ul style={{ margin: '4px 0 0 18px', fontSize: '0.85rem' }}>
            {r.criteria_met.map((c, i) => (
              <li key={i}>{c.passed ? '✔' : '✘'} {c.text}{c.additional ? ' (additional)' : ' (core)'}</li>
            ))}
          </ul>
          <div className="rk-muted" style={{ marginTop: 6 }}>
            Calculated {fmtDate(r.created_at)}
            {r.decided_at && ` · ${r.status} ${fmtDate(r.decided_at)} by ${r.decided_by_name || 'system'}${r.decided_by_role ? ` (${r.decided_by_role})` : ''}`}
            {r.decision_reason && ` — ${r.decision_reason}`}
          </div>
          {r.status === 'pending' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="button" className="rk-btn rk-btn--primary rk-btn--sm" onClick={() => { setErr(''); setDialog({ kind: 'approve', row: r }); }}>Approve</button>
              <button type="button" className="rk-btn rk-btn--danger rk-btn--sm" onClick={() => { setErr(''); setDialog({ kind: 'reject', row: r }); }}>Reject</button>
            </div>
          )}
        </div>
      ))}

      {dialog && (
        <ReasonModal
          title={dialog.kind === 'approve' ? `Approve ${dialog.row.proposed_rank?.name}` : `Reject ${dialog.row.proposed_rank?.name}`}
          intro={dialog.kind === 'approve'
            ? `Award ${dialog.row.investor_name} the ${dialog.row.proposed_rank?.name} rank. Eligibility is re-checked against today's verified records when you confirm.`
            : `The investor will not be awarded ${dialog.row.proposed_rank?.name}. This is not raised again unless the rules change.`}
          confirmLabel={dialog.kind === 'approve' ? 'Approve & award' : 'Reject'}
          required={dialog.kind === 'reject'} danger={dialog.kind === 'reject'}
          busy={busy} error={err} onConfirm={decide} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}
