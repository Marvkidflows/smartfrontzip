import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import ReasonModal from './ReasonModal';
import { rankService, apiError } from '../../../services/rankService';
import { fmtDate } from './rankUtils';

const REASON = { missing_currency: 'No payment currency recorded', missing_rate: 'No exchange rate recorded', missing_rate_source: 'No rate source recorded', stale_rate: 'Rate older than the approved maximum age',
  unsupported_pair: 'Unsupported currency pair', no_valuation: 'No verified valuation', inconsistent_amount: 'Amounts do not reconcile', crypto_unapproved: 'Cryptocurrency — valuation not approved' };

// Currency reconciliation queue and the approved exchange-rate register (Financial Team decisions, 27 Oct 2026).
export default function FinancialControlsTab() {
  const [status, setStatus] = useState('open');
  const [q, setQ] = useState(null);
  const [src, setSrc] = useState(null);
  const [modal, setModal] = useState(null);
  const [extra, setExtra] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([rankService.reconciliation({ status }), rankService.fxSources()]);
      setQ(a.data); setSrc(b.data);
    } catch (e) { toast.error(apiError(e, 'Could not load the controls.')); }
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const ask = (cfg) => { setExtra(cfg.init || {}); setErr(''); setModal(cfg); };
  const confirm = async (reason) => {
    setBusy(true); setErr('');
    try { await modal.run(reason, extra); setModal(null); toast.success('Saved.'); await load(); }
    catch (e) { setErr(apiError(e, 'Could not save.')); }
    finally { setBusy(false); }
  };
  const field = (name, label, type = 'text', options = []) => (
    <div key={name}><label className="rk-label" htmlFor={`fc-${name}`}>{label}</label>
      {type === 'select'
        ? <select id={`fc-${name}`} className="rk-input" value={extra[name] ?? ''} onChange={(e) => setExtra({ ...extra, [name]: e.target.value })}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        : <input id={`fc-${name}`} className="rk-input" type={type} value={extra[name] ?? ''} onChange={(e) => setExtra({ ...extra, [name]: e.target.value })} />}
    </div>
  );

  const scan = async () => {
    try { const r = await rankService.scanReconciliation(); toast.success(`Scan finished: ${Object.values(r.data.opened).reduce((a, b) => a + b, 0)} new item(s).`); await load(); }
    catch (e) { toast.error(apiError(e, 'Scan failed.')); }
  };
  const resolve = (it) => ask({
    title: `Resolve ${it.subject_type} #${it.subject_id}`, confirmLabel: 'Record resolution',
    intro: 'Preserves the original record. A correction is stored as an auditable adjustment and the investor is re-assessed only after it is recorded. Evidence is required. No rate is assumed.',
    init: { outcome: 'unresolved' },
    fields: [['outcome', 'Outcome', 'select', [['unresolved', 'Evidence insufficient — keep unresolved'], ['verified_as_recorded', 'Verified as recorded'], ['adjusted', 'Adjust (enter the corrected conversion)']]],
             ['currency', 'Corrected currency (adjust only)'], ['rate', 'Exchange rate (non-USD)', 'number'], ['rate_source', 'Rate source'], ['rate_date', 'Rate date', 'date']],
    run: (reason, x) => rankService.resolveReconciliation(it.id, { outcome: x.outcome, evidence: reason,
      ...(x.outcome === 'adjusted' ? { correction: { currency: x.currency, rate: x.rate ? Number(x.rate) : undefined, rate_source: x.rate_source || undefined, rate_date: x.rate_date || undefined } } : {}) }),
  });
  const addSource = () => ask({
    title: 'Document an approved exchange-rate source', confirmLabel: 'Add to register', required: false,
    intro: 'No provider is treated as approved until it is documented here. A source without a maximum rate age cannot be checked for staleness. Cryptocurrency cannot be added.',
    fields: [['currency', 'Currency (ISO code)'], ['primary_source', 'Primary rate provider and source'], ['fallback_source', 'Fallback provider (if any)'], ['rate_type', 'Rate type (e.g. settlement, reference)'],
             ['max_age_hours', 'Maximum rate age (hours)', 'number'], ['approval_reference', 'Approval reference'], ['effective_from', 'Effective from', 'date']],
    run: (reason, x) => rankService.addFxSource({ currency: (x.currency || '').toUpperCase(), primary_source: x.primary_source, fallback_source: x.fallback_source || undefined, rate_type: x.rate_type,
      max_age_hours: x.max_age_hours ? Number(x.max_age_hours) : undefined, approval_reference: x.approval_reference, effective_from: x.effective_from }),
  });

  if (!q || !src) return <div className="skeleton" style={{ height: 160 }} aria-busy="true" />;
  return (
    <div>
      <div className="rk-banner rk-banner--info">
        <strong>Financial controls.</strong> Records with missing, inconsistent or incomplete currency metadata are held out of rank eligibility until an authorised officer resolves them with evidence.
        Nothing here rewrites a record or assigns a guessed rate. Live exchange-rate providers are not enabled.
      </div>

      <h3>Reconciliation queue</h3>
      <div className="rk-toolbar">
        <select className="rk-input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="open">Open</option><option value="unresolved">Unresolved</option><option value="resolved">Resolved</option>
        </select>
        <span className="rk-muted">{Object.entries(q.counts || {}).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'Queue is empty'}</span>
        <button type="button" className="rk-btn rk-btn--sm" onClick={scan}>Scan records</button>
      </div>
      <div className="rk-table-wrap">
        <table className="rk-table">
          <thead><tr><th>Record</th><th>Issue</th><th>Detail</th><th>Status</th><th>Resolved</th><th /></tr></thead>
          <tbody>
            {q.data.length === 0 && <tr><td colSpan={6} className="rk-muted">Nothing to show.</td></tr>}
            {q.data.map((it) => (
              <tr key={it.id}>
                <td>{it.subject_type} #{it.subject_id}</td><td>{REASON[it.reason_code] || it.reason_code}</td><td>{it.detail}</td><td>{it.status}</td>
                <td>{it.resolved_at ? `${it.resolved_by_name}, ${fmtDate(it.resolved_at)}` : '—'}</td>
                <td>{it.status !== 'resolved' && <button type="button" className="rk-btn rk-btn--sm" onClick={() => resolve(it)}>Resolve</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Approved exchange-rate register</h3>
      <p className="rk-muted">{src.note}</p>
      <button type="button" className="rk-btn rk-btn--sm" onClick={addSource}>Document an approved source</button>
      <div className="rk-table-wrap">
        <table className="rk-table">
          <thead><tr><th>Currency</th><th>Primary source</th><th>Fallback</th><th>Rate type</th><th>Max age (h)</th><th>Approval</th><th>Effective</th></tr></thead>
          <tbody>
            {src.data.length === 0 && <tr><td colSpan={7} className="rk-muted">No source is approved yet.</td></tr>}
            {src.data.map((s) => (
              <tr key={s.id}><td>{s.currency}→{s.reference_currency}</td><td>{s.primary_source}</td><td>{s.fallback_source || '—'}</td><td>{s.rate_type}</td>
                <td>{s.max_age_hours ?? 'not set'}</td><td>{s.approval_reference} ({s.approved_by_name})</td><td>{fmtDate(s.effective_from)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && <ReasonModal title={modal.title} intro={modal.intro} confirmLabel={modal.confirmLabel} required={modal.required !== false} busy={busy} error={err}
        extra={<>{(modal.fields || []).map(([n, l, t, o]) => field(n, l, t, o))}</>} onConfirm={confirm} onClose={() => setModal(null)} />}
    </div>
  );
}
