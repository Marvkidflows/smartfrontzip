import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { financialService } from '../../services/api';
import useAuthStore from '../../store/authStore';
import '../admin/AdminPages.css';
import './FinancialPages.css';

// Task 5 - Financial Administration: withdrawal fee policy, fee report, adjustments and reconciliation. Server re-authorises every action.
const money = (v) => `$${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const err = (e, d) => e.response?.data?.errors ? Object.values(e.response.data.errors).flat()[0] : (e.response?.data?.message || d);

export default function FinancialWithdrawalFees() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [policy, setPolicy] = useState(null); const [sum, setSum] = useState(null);
  const [rows, setRows] = useState([]); const [meta, setMeta] = useState({ page: 1, last_page: 1, total: 0 });
  const [filters, setFilters] = useState({ status: '', fee_status: '', q: '' }); const [page, setPage] = useState(1);
  const [form, setForm] = useState({ fee_type: 'none', fixed_amount: '', percentage: '', min_fee: '', max_fee: '', is_active: false, policy_approved: false, approval_reference: '', effective_from: '', reason: '' });
  const [events, setEvents] = useState(null); const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    financialService.feePolicy().then(r => setPolicy(r.data)).catch(() => toast.error('Could not load the fee policy'));
    financialService.feeSummary().then(r => setSum(r.data.summary)).catch(() => {});
    financialService.feeWithdrawals({ ...filters, page, per_page: 20 }).then(r => { setRows(r.data.withdrawals); setMeta(r.data.meta); }).catch(() => {});
  }, [filters, page]);
  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const body = Object.fromEntries(Object.entries({ ...form, policy_approved: isAdmin && form.policy_approved }).filter(([, v]) => v !== ''));
      await financialService.saveFeePolicy(body); toast.success('Fee policy version saved'); load();
    } catch (x) { toast.error(err(x, 'Could not save')); } finally { setBusy(false); }
  };
  const adjust = async (w, action) => {
    const reason = window.prompt(`Reason to ${action} the fee on ${w.transaction_reference} (required):`); if (!reason) return;
    const refund = action !== 'review' && isAdmin && window.confirm('Also refund the fee to the investor wallet? (OK = refund, Cancel = record only)');
    setBusy(true);
    try { await financialService.feeAdjust(w.id, { action, reason, refund_to_wallet: refund }); toast.success('Recorded'); load(); } catch (x) { toast.error(err(x, 'Action failed')); } finally { setBusy(false); }
  };
  const showEvents = (id) => financialService.feeEvents(id).then(r => setEvents({ id, list: r.data.events }));

  const cur = policy?.in_force ?? policy?.current; const A = sum?.amounts;   // banner describes the version actually governing charges (an unapproved newer draft never overrides it)
  return (
    <div className="adm-page">
      <div className="adm-page-header"><div><h1>Withdrawal fees</h1><p>Fees charged (disclosed) and fees collected (withdrawal approved) are reported separately.</p></div></div>
      <div className="inv-announcement" style={{ marginBottom: '1rem' }}>
        {policy?.charging_fees ? <>Fees are <strong>ACTIVE</strong>: {cur.fee_type} {cur.fixed_amount ? `${cur.fixed_amount} USD ` : ''}{cur.percentage ? `${cur.percentage}% ` : ''}(approved {cur.approval_reference}).</> : <>No fee is being charged. A fee applies only when a policy is <strong>active</strong>, <strong>Management-approved</strong> and effective.</>}
      </div>

      {A && <div className="fin-summary-grid">{[['Gross requested', A.gross_requested], ['Fees charged', A.fees_charged], ['Net payable', A.net_payable], ['Fees collected', A.fees_collected], ['Fees not collected (rejected)', A.fees_not_collected], ['Fees reversed / adjusted', A.fees_reversed_or_adjusted], ['Awaiting review', A.fees_awaiting_review], ['Outstanding (pending/hold)', A.fees_outstanding]].map(([l, v]) => <div key={l} className="fin-kv" style={{ padding: '0.75rem' }}><div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{l}</div><strong>{money(v)}</strong></div>)}</div>}
      {sum && <p style={{ fontSize: '0.85rem' }}>Reconciliation: {sum.reconciliation.length === 0 ? '✔ reconciled' : `⚠ ${sum.reconciliation.length} item(s) need review: ${sum.reconciliation.slice(0, 5).map(i => `#${i.withdrawal_id} ${i.code}`).join(', ')}`}</p>}

      <div className="fin-filters" style={{ margin: '1rem 0' }}>
        <input className="form-control" placeholder="Search reference, name, email" value={filters.q} onChange={e => { setPage(1); setFilters(f => ({ ...f, q: e.target.value })); }} />
        <select className="form-control" value={filters.status} onChange={e => { setPage(1); setFilters(f => ({ ...f, status: e.target.value })); }}><option value="">All statuses</option>{['pending', 'approved', 'rejected', 'hold'].map(s => <option key={s}>{s}</option>)}</select>
        <select className="form-control" value={filters.fee_status} onChange={e => { setPage(1); setFilters(f => ({ ...f, fee_status: e.target.value })); }}><option value="">All fee statuses</option>{['none', 'charged', 'collected', 'not_collected', 'reversed', 'waived', 'review'].map(s => <option key={s}>{s}</option>)}</select>
      </div>
      <div className="table-wrap"><table>
        <thead><tr><th>Reference</th><th>Investor</th><th>Gross</th><th>Fee</th><th>Net</th><th>Status</th><th>Fee status</th><th /></tr></thead>
        <tbody>{rows.map(w => <tr key={w.id}><td style={{ fontFamily: 'monospace' }}>{w.transaction_reference || `#${w.id}`}</td><td>{w.investor.name}</td><td>{money(w.gross_amount)}</td><td>{money(w.fee_amount)}</td><td>{money(w.net_amount)}</td><td>{w.status}</td><td>{w.fee_status}</td>
          <td style={{ whiteSpace: 'nowrap' }}><button className="btn btn-sm btn-ghost" onClick={() => showEvents(w.id)}>History</button>
            {Number(w.fee_amount) > 0 && w.fee_status === 'collected' && <><button className="btn btn-sm btn-outline" disabled={busy} onClick={() => adjust(w, 'reverse')}>Reverse</button><button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => adjust(w, 'waive')}>Waive</button></>}
            {Number(w.fee_amount) > 0 && <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => adjust(w, 'review')}>Flag</button>}</td></tr>)}
          {!rows.length && <tr><td colSpan={8} style={{ textAlign: 'center', padding: '1.5rem' }}>No withdrawals.</td></tr>}</tbody></table></div>
      <div className="fin-pager"><button className="btn btn-sm btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button> Page {meta.page} of {meta.last_page} <button className="btn btn-sm btn-ghost" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}>Next</button></div>
      {events && <div className="inv-card" style={{ marginTop: '1rem' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><h4>Fee events for withdrawal #{events.id}</h4><button className="btn btn-sm btn-ghost" onClick={() => setEvents(null)}>Close</button></div>
        <ul style={{ fontSize: '0.85rem' }}>{events.list.map(e => <li key={e.id}>{e.at?.slice(0, 16).replace('T', ' ')} — {e.event} {money(e.amount)} ({e.reference}){e.related_event_id ? ` ↩ event ${e.related_event_id}` : ''} by {e.actor}{e.reason ? ` — ${e.reason}` : ''}</li>)}{!events.list.length && <li>No fee events.</li>}</ul></div>}

      <form className="inv-card" style={{ marginTop: '1.5rem' }} onSubmit={save}>
        <h3>Configure fee policy</h3>
        <p style={{ fontSize: '0.85rem' }}>Saving creates a new version. It never changes withdrawals already submitted. A fee is charged only if the version is active, Management-approved (Administrator) and effective.</p>
        <div className="form-group"><label className="form-label">Fee type</label><select className="form-control" value={form.fee_type} onChange={e => setForm(f => ({ ...f, fee_type: e.target.value }))}>{['none', 'fixed', 'percentage', 'combined'].map(t => <option key={t}>{t}</option>)}</select></div>
        {['fixed', 'combined'].includes(form.fee_type) && <div className="form-group"><label className="form-label">Fixed amount (USD)</label><input className="form-control" type="number" step="0.01" min="0.01" required value={form.fixed_amount} onChange={e => setForm(f => ({ ...f, fixed_amount: e.target.value }))} /></div>}
        {['percentage', 'combined'].includes(form.fee_type) && <div className="form-group"><label className="form-label">Percentage of the requested (gross) amount</label><input className="form-control" type="number" step="0.0001" min="0.0001" max="100" required value={form.percentage} onChange={e => setForm(f => ({ ...f, percentage: e.target.value }))} /></div>}
        {form.fee_type !== 'none' && <div style={{ display: 'flex', gap: 8 }}><input className="form-control" type="number" step="0.01" placeholder="Minimum fee (optional)" value={form.min_fee} onChange={e => setForm(f => ({ ...f, min_fee: e.target.value }))} /><input className="form-control" type="number" step="0.01" placeholder="Maximum fee (optional)" value={form.max_fee} onChange={e => setForm(f => ({ ...f, max_fee: e.target.value }))} /></div>}
        <div className="form-group"><label className="form-label">Effective from (blank = now; cannot be in the past)</label><input className="form-control" type="datetime-local" value={form.effective_from} onChange={e => setForm(f => ({ ...f, effective_from: e.target.value }))} /></div>
        <label style={{ display: 'block' }}><input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} /> Active</label>
        <div className="form-group"><label className="form-label">Reason (required)</label><input className="form-control" required minLength={3} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} /></div>
        {isAdmin ? <><label style={{ display: 'block' }}><input type="checkbox" checked={form.policy_approved} onChange={e => setForm(f => ({ ...f, policy_approved: e.target.checked }))} /> Management-approved</label>
          {form.policy_approved && <div className="form-group"><label className="form-label">Management approval reference</label><input className="form-control" required value={form.approval_reference} onChange={e => setForm(f => ({ ...f, approval_reference: e.target.value }))} /></div>}</> : <p style={{ fontSize: '0.8rem' }}>Only an Administrator can mark a fee policy as Management-approved.</p>}
        <button className="btn btn-primary" disabled={busy}>Save new fee policy version</button>
        <h4 style={{ marginTop: '1rem' }}>Policy history</h4>
        <ul style={{ fontSize: '0.8rem' }}>{(policy?.history || []).map(h => <li key={h.id}>#{h.id} {h.created_at?.slice(0, 16).replace('T', ' ')} — {h.fee_type}{h.fixed_amount ? ` ${h.fixed_amount} USD` : ''}{h.percentage ? ` ${h.percentage}%` : ''}, {h.is_active ? 'active' : 'inactive'}, {h.policy_approved ? `approved (${h.approval_reference})` : 'unapproved'}, effective {h.effective_from?.slice(0, 16).replace('T', ' ')} — {h.configured_by}: {h.reason}</li>)}</ul>
      </form>
    </div>
  );
}
