import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import RankBadge from '../../../components/RankBadge';
import { rankService, apiError } from '../../../services/rankService';
import { fmtDate } from './rankUtils';
import ReasonModal from './ReasonModal';
import ValuationReviewNote from '../../../components/ValuationReviewNote';

export default function RankReviewsTab({ onChanged }) {
  const [status, setStatus] = useState('open');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retain, setRetain] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows((await rankService.reviews({ status })).data.data); }
    catch (e) { toast.error(apiError(e, 'Could not load reviews.')); }
    finally { setLoading(false); }
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const doRetain = async (reason) => {
    setBusy(true); setErr('');
    try { const r = await rankService.retainReview(retain.id, { reason }); toast.success(r.data.message); setRetain(null); load(); onChanged?.(); }
    catch (e) { setErr(apiError(e)); } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="rk-banner rk-banner--info">
        These investors no longer satisfy the active criteria for their current rank. <strong>Nothing has been changed automatically.</strong> Decide to retain the rank, or open the investor to downgrade with a reason.
      </div>
      <div className="rk-toolbar">
        <select className="rk-select" aria-label="Review status" value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 220 }}>
          <option value="open">Awaiting decision</option><option value="retained">Retained</option>
          <option value="downgraded">Downgraded</option><option value="cleared">Cleared (qualifies again)</option><option value="all">All</option>
        </select>
      </div>

      {loading && <div className="adm-empty">Loading…</div>}
      {!loading && rows.length === 0 && <div className="adm-empty">Nothing here.</div>}
      {rows.map((r) => (
        <div key={r.id} className="rk-run">
          <div className="rk-run__row">
            <div style={{ minWidth: 0 }}>
              <strong style={{ overflowWrap: 'anywhere' }}>{r.investor_name}</strong> <span className="rk-mono rk-muted">{r.account_id}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <RankBadge rank={r.rank} size="sm" />
              <span className={`rk-chip ${r.status === 'open' ? 'rk-chip--warn' : 'rk-chip--muted'}`}>{r.status}</span>
              {r.status === 'open' && !r.alert_delivered && <span className="rk-chip rk-chip--bad" title="The admin alert for this review has not been delivered yet">alert pending</span>}
            </div>
          </div>
          <div className="rk-muted">{r.valuation_note ? `Possible shortfall, may be valuation-related (rule v${r.criterion_version}):` : `No longer met (rule v${r.criterion_version}):`}</div>
          <ul style={{ margin: '4px 0 0 18px', fontSize: '0.85rem' }}>{r.failed_conditions.map((c, i) => <li key={i}>{c.text}</li>)}</ul>
          <ValuationReviewNote note={r.valuation_note} />
          <div className="rk-muted" style={{ marginTop: 6 }}>Raised {fmtDate(r.created_at)}{r.resolved_at && ` · decided ${fmtDate(r.resolved_at)} by ${r.resolved_by_name || 'system'}`}{r.resolution_reason && ` — ${r.resolution_reason}`}</div>
          {r.status === 'open' && (
            <div className="rk-btn-row" style={{ marginTop: 8 }}>
              <button className="rk-btn rk-btn--sm rk-btn--primary" onClick={() => setRetain(r)}>Retain rank</button>
              <Link className="rk-btn rk-btn--sm" to={`/admin/ranks/investors/${r.investor_id}`}>Review &amp; downgrade…</Link>
            </div>
          )}
        </div>
      ))}

      {retain && <ReasonModal title="Retain current rank" intro={`Keep ${retain.investor_name} at ${retain.rank?.name}.`} confirmLabel="Retain rank"
        busy={busy} error={err} onConfirm={doRetain} onClose={() => { setRetain(null); setErr(''); }} />}
    </div>
  );
}
