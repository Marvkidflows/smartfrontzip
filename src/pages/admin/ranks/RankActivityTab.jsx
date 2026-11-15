import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { rankService, apiError } from '../../../services/rankService';
import { RUN_STATUS, fmtDate } from './rankUtils';

export default function RankActivityTab({ onChanged }) {
  const [runs, setRuns] = useState([]);
  const [alerts, setAlerts] = useState({ data: [], counts: {} });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const timer = useRef(null);

  const load = useCallback(async () => {
    try {
      const [r, a] = await Promise.all([rankService.runs(), rankService.alerts({ status: 'failed' })]);
      setRuns(r.data.data); setAlerts(a.data);
    } catch (e) { toast.error(apiError(e, 'Could not load activity.')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll while anything is still in flight so progress is always visible.
  const inFlight = runs.some((r) => ['pending', 'running'].includes(r.status));
  useEffect(() => {
    if (!inFlight) return undefined;
    timer.current = setInterval(() => { load(); onChanged?.(); }, 4000);
    return () => clearInterval(timer.current);
  }, [inFlight, load, onChanged]);

  const act = async (label, fn) => {
    setBusy(label);
    try { const r = await fn(); toast.success(r.data.message); await load(); onChanged?.(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(''); }
  };

  const failedCount = alerts.counts?.failed || 0;

  return (
    <div>
      <div className="rk-toolbar" style={{ justifyContent: 'space-between' }}>
        <div className="rk-muted">Re-evaluations run in the background after criteria change. A run only shows “Completed” when every investor was processed.</div>
        <button className="rk-btn rk-btn--primary" disabled={busy === 'start'} onClick={() => act('start', rankService.startRun)}>
          {busy === 'start' ? 'Queuing…' : 'Re-evaluate all investors'}
        </button>
      </div>

      <h3>Re-evaluation runs</h3>
      {loading && <div className="adm-empty">Loading…</div>}
      {!loading && runs.length === 0 && <div className="adm-empty">No runs yet. A run starts automatically when you activate or edit criteria.</div>}
      {runs.map((r) => {
        const st = RUN_STATUS[r.status] || { label: r.status, tone: 'info' };
        const tone = r.is_stalled ? 'bad' : st.tone;
        return (
          <div key={r.id} className="rk-run">
            <div className="rk-run__row">
              <div><strong className="rk-mono">{r.reference}</strong> <span className="rk-muted">· {r.trigger.replace('_', ' ')} · started {fmtDate(r.started_at || r.created_at)}</span></div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {r.is_stalled && <span className="rk-chip rk-chip--bad">Stalled — is the queue worker running?</span>}
                <span className={`rk-chip rk-chip--${st.tone}`}>{st.label}</span>
              </div>
            </div>
            <div className={`rk-progress ${tone === 'ok' ? 'rk-progress--ok' : tone === 'bad' ? 'rk-progress--bad' : ''}`} role="progressbar"
              aria-valuenow={r.percent} aria-valuemin={0} aria-valuemax={100} aria-label={`Run ${r.reference} progress`}><div style={{ width: `${r.percent}%` }} /></div>
            <div className="rk-run__stats">
              <span><strong>{(r.processed + r.failed).toLocaleString()}</strong> / {r.total.toLocaleString()} processed</span>
              <span><strong>{r.upgraded.toLocaleString()}</strong> upgraded</span>
              <span className={r.failed ? 'rk-fail' : ''}><strong>{r.failed.toLocaleString()}</strong> failed</span>
              {r.finished_at && <span className="rk-muted">finished {fmtDate(r.finished_at)}</span>}
              {r.upgraded > 0 && <Link to={`/admin/ranks/audit?run_id=${r.id}`}>View upgrades →</Link>}
            </div>
            {r.error && <div className="rk-error">{r.error}</div>}
            {r.failures.length > 0 && (
              <details style={{ marginTop: 6 }}><summary className="rk-muted">{r.failures.length} investor(s) could not be evaluated</summary>
                <ul style={{ fontSize: '0.8rem' }}>{r.failures.map((f, i) => <li key={i}>Investor #{f.investor_id}: {f.error}</li>)}</ul></details>
            )}
            {(r.status === 'failed' || r.is_stalled) && (
              <button className="rk-btn rk-btn--sm" style={{ marginTop: 8 }} disabled={busy === `r${r.id}`} onClick={() => act(`r${r.id}`, () => rankService.resumeRun(r.id))}>Resume run</button>
            )}
          </div>
        );
      })}

      <h3 style={{ marginTop: 24 }}>Admin alert delivery</h3>
      {failedCount === 0 ? <div className="rk-muted">All upgrade alerts were delivered.</div> : (
        <>
          <div className="rk-banner rk-banner--bad"><strong>{failedCount}</strong> upgrade alert(s) could not be delivered. The upgrades themselves are unaffected and recorded in the audit log.
            <div style={{ marginTop: 8 }}><button className="rk-btn rk-btn--sm" disabled={busy === 'retry'} onClick={() => act('retry', rankService.retryAlerts)}>Retry failed alerts</button></div></div>
          <div className="rk-table-wrap"><table className="rk-table">
            <thead><tr><th>Reference</th><th>Account</th><th>Attempts</th><th>Last error</th></tr></thead>
            <tbody>{alerts.data.map((a) => <tr key={a.id}><td className="rk-mono">{a.reference}</td><td className="rk-mono">{a.account_id}</td><td>{a.attempts}</td><td style={{ overflowWrap: 'anywhere' }}>{a.last_error}</td></tr>)}</tbody>
          </table></div>
        </>
      )}
    </div>
  );
}
