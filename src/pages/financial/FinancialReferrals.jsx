import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { financialService } from '../../services/api';
import useAuthStore from '../../store/authStore';
import '../admin/AdminPages.css';
import './FinancialPages.css';

// Task 5 - Financial Administration: referral rewards. Buttons are hidden by role for convenience only; EVERY action is re-authorised by the server.
const money = (v) => `$${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const CRITERIA = [['require_kyc_approved', 'KYC approved'], ['require_approved_deposit', 'Has an approved deposit'], ['require_investment', 'Has a qualifying investment'], ['require_completed_cycle', 'Has completed an investment cycle'], ['referrer_must_be_active', 'Referrer must be active']];
const err = (e, d) => e.response?.data?.errors ? Object.values(e.response.data.errors).flat()[0] : (e.response?.data?.message || d);

export default function FinancialReferrals() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]); const [meta, setMeta] = useState({ page: 1, last_page: 1, total: 0 });
  const [filters, setFilters] = useState({ status: '', eligibility: '', suspicious: '', q: '' }); const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null); const [busy, setBusy] = useState(false);
  const [policy, setPolicy] = useState(null); const [pf, setPf] = useState(null);

  const load = useCallback(() => {
    financialService.referralSummary().then(r => setSummary(r.data.summary)).catch(() => toast.error('Could not load the summary'));
    financialService.referralList({ ...filters, page, per_page: 20 }).then(r => { setRows(r.data.rewards); setMeta(r.data.meta); }).catch(() => toast.error('Could not load referrals'));
  }, [filters, page]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { financialService.referralPolicy().then(r => { setPolicy(r.data); const p = r.data.policy; setPf({ reward_amount: p?.reward_amount || '5.00', criteria: { ...(p?.criteria || {}) }, policy_approved: false, approval_reference: '', reason: '' }); }).catch(() => {}); }, []);

  const open = (id) => financialService.referralShow(id).then(r => setDetail(r.data)).catch(() => toast.error('Could not load the record'));
  const act = async (id, action, needReason) => {
    let data = {};
    if (needReason) { const reason = window.prompt('Reason (required, recorded in the audit log):'); if (!reason) return; data = action === 'approve' ? { note: reason } : { reason }; }
    else if (!window.confirm(`Confirm: ${action} this reward?`)) return;
    setBusy(true);
    try { const r = await financialService.referralAction(id, action, data); toast.success(r.data.message || 'Done'); load(); if (detail) open(id); }
    catch (e) { toast.error(err(e, 'Action failed')); } finally { setBusy(false); }
  };
  const exportCsv = async () => {
    try { const r = await financialService.referralExport(filters); const a = document.createElement('a'); a.href = URL.createObjectURL(r.data); a.download = 'referral-rewards.csv'; a.click(); URL.revokeObjectURL(a.href); }
    catch (e) { toast.error('Export failed'); }
  };
  const savePolicy = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await financialService.saveReferralPolicy({ ...pf, policy_approved: isAdmin && pf.policy_approved }); toast.success('Policy version saved'); const r = await financialService.referralPolicy(); setPolicy(r.data); load(); }
    catch (x) { toast.error(err(x, 'Could not save')); } finally { setBusy(false); }
  };

  const S = summary;
  const cards = S ? [['Total referrals', S.total_referrals], ['Link visits', S.link_visits], ['Registrations started', S.registrations_started], ['Registrations completed', S.registrations_completed], ['Activated', S.activated], ['Eligible', S.eligible],
    ['Pending rewards', S.pending], ['Approved rewards', S.approved], ['Credited rewards', S.credited], ['Rejected', S.rejected], ['Reversed', S.reversed], ['Suspicious', S.suspicious],
    ['Pending liability', money(S.pending_liability)], ['Approved (unpaid) liability', money(S.approved_liability)], ['Total reward liability', money(S.total_liability)], ['Credited value', money(S.credited_value)]] : [];

  return (
    <div className="adm-page">
      <div className="adm-page-header"><div><h1>Referral rewards</h1><p>Pending and approved rewards are liabilities, not payments. Only credited rewards have moved money.</p></div>
        <button className="btn btn-outline" onClick={exportCsv}>Export CSV</button></div>

      {S && !S.policy?.policy_approved && <div className="inv-announcement" style={{ marginBottom: '1rem' }}>The referral policy is <strong>not approved</strong>. Rewards are tracked as Pending but cannot be approved or credited until an Administrator records the Management approval.</div>}
      <div className="fin-summary-grid">{cards.map(([l, v]) => <div key={l} className="fin-kv" style={{ padding: '0.75rem' }}><div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{l}</div><strong>{v}</strong></div>)}</div>

      <div className="fin-filters" style={{ margin: '1rem 0' }}>
        <input className="form-control" placeholder="Search name, email, code, reference" value={filters.q} onChange={e => { setPage(1); setFilters(f => ({ ...f, q: e.target.value })); }} />
        <select className="form-control" value={filters.status} onChange={e => { setPage(1); setFilters(f => ({ ...f, status: e.target.value })); }}><option value="">All statuses</option>{['pending', 'approved', 'credited', 'rejected', 'reversed'].map(s => <option key={s}>{s}</option>)}</select>
        <select className="form-control" value={filters.eligibility} onChange={e => { setPage(1); setFilters(f => ({ ...f, eligibility: e.target.value })); }}><option value="">Any eligibility</option>{['not_checked', 'policy_not_approved', 'not_eligible', 'eligible'].map(s => <option key={s}>{s}</option>)}</select>
        <select className="form-control" value={filters.suspicious} onChange={e => { setPage(1); setFilters(f => ({ ...f, suspicious: e.target.value })); }}><option value="">All</option><option value="1">Suspicious only</option></select>
      </div>

      <div className="table-wrap"><table>
        <thead><tr><th>Ref</th><th>Referrer</th><th>Referred</th><th>Registered</th><th>Activated</th><th>Eligibility</th><th>Amount</th><th>Status</th><th /></tr></thead>
        <tbody>{rows.map(r => (
          <tr key={r.id} className="fin-row-click">
            <td onClick={() => open(r.id)} style={{ fontFamily: 'monospace' }}>{r.reference}{r.suspicious && ' ⚠'}</td>
            <td>{r.referrer.name}</td><td>{r.referred.name}</td>
            <td>{r.registration_completed_at?.slice(0, 10) || '—'}</td><td>{r.activated_at?.slice(0, 10) || 'No'}</td><td>{r.eligibility}</td>
            <td>{money(r.amount)}</td><td><span className="badge">{r.status}</span></td>
            <td style={{ whiteSpace: 'nowrap' }}>
              <button className="btn btn-sm btn-ghost" onClick={() => open(r.id)}>Review</button>
              {r.status === 'pending' && <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => act(r.id, 'approve', true)}>Approve</button>}
              {r.status === 'approved' && <button className="btn btn-sm btn-gold" disabled={busy} onClick={() => act(r.id, 'credit', false)}>Credit</button>}
              {['pending', 'approved'].includes(r.status) && <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => act(r.id, 'reject', true)}>Reject</button>}
            </td></tr>))}
          {!rows.length && <tr><td colSpan={9} style={{ textAlign: 'center', padding: '1.5rem' }}>No referrals match.</td></tr>}</tbody>
      </table></div>
      <div className="fin-pager"><button className="btn btn-sm btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button> Page {meta.page} of {meta.last_page} ({meta.total}) <button className="btn btn-sm btn-ghost" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}>Next</button></div>

      {detail && (
        <div className="inv-card" style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><h3>{detail.reward.reference} — {detail.reward.status}</h3><button className="btn btn-sm btn-ghost" onClick={() => setDetail(null)}>Close</button></div>
          <p>Referrer: {detail.reward.referrer.name} ({detail.reward.referrer.email}) · Referred: {detail.reward.referred.name} ({detail.reward.referred.email}, KYC {detail.reward.referred.kyc_status})</p>
          <p>Eligibility: <strong>{detail.reward.eligibility}</strong>{detail.reward.flags?.length ? ` · Flags: ${detail.reward.flags.join(', ')}` : ''}{detail.reward.credit_reference ? ` · Credit ref ${detail.reward.credit_reference}` : ''}{detail.reward.reversal_reference ? ` · Reversal ref ${detail.reward.reversal_reference} (${detail.reward.reversal_reason})` : ''}</p>
          <ul style={{ fontSize: '0.85rem' }}>{Object.entries(detail.reward.eligibility_detail?.checks || {}).map(([k, v]) => <li key={k}>{v.passed ? '✔' : '✘'} {k}: {v.detail}</li>)}</ul>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '0.5rem 0' }}>
            <button className="btn btn-sm btn-outline" disabled={busy} onClick={() => act(detail.reward.id, 'evaluate', false)}>Re-check eligibility</button>
            {detail.reward.suspicious ? <button className="btn btn-sm btn-outline" disabled={busy} onClick={() => act(detail.reward.id, 'unflag', true)}>Clear suspicious flag</button> : <button className="btn btn-sm btn-outline" disabled={busy} onClick={() => act(detail.reward.id, 'flag', true)}>Flag for investigation</button>}
            {isAdmin && detail.reward.status === 'credited' && <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => act(detail.reward.id, 'reverse', true)}>Reverse credit</button>}
          </div>
          <h4>History</h4>
          <ul style={{ fontSize: '0.85rem' }}>{detail.history.map((h, i) => <li key={i}>{h.at?.slice(0, 16).replace('T', ' ')} — {h.event}{h.to ? ` → ${h.to}` : ''} by {h.actor}{h.reason ? ` — ${h.reason}` : ''}</li>)}</ul>
        </div>
      )}

      {pf && (
        <form className="inv-card" style={{ marginTop: '1.5rem' }} onSubmit={savePolicy}>
          <h3>Reward amount & eligibility rules</h3>
          <p style={{ fontSize: '0.85rem' }}>Current: {policy?.policy?.reward_amount} USD · {policy?.policy?.policy_approved ? `approved (${policy.policy.approval_reference})` : 'NOT approved'}. Saving creates a new version; existing rewards keep their amount.</p>
          <div className="form-group"><label className="form-label">Reward per eligible referral (USD)</label><input className="form-control" type="number" step="0.01" min="0.01" required value={pf.reward_amount} onChange={e => setPf(f => ({ ...f, reward_amount: e.target.value }))} /></div>
          {CRITERIA.map(([k, l]) => <label key={k} style={{ display: 'block' }}><input type="checkbox" checked={!!pf.criteria[k]} onChange={e => setPf(f => ({ ...f, criteria: { ...f.criteria, [k]: e.target.checked } }))} /> {l}</label>)}
          <div className="form-group"><label className="form-label">Max rewards per referrer (blank = no limit)</label><input className="form-control" type="number" min="1" value={pf.criteria.max_rewards_per_referrer ?? ''} onChange={e => setPf(f => ({ ...f, criteria: { ...f.criteria, max_rewards_per_referrer: e.target.value } }))} /></div>
          <div className="form-group"><label className="form-label">Reason for this change (required)</label><input className="form-control" required minLength={3} value={pf.reason} onChange={e => setPf(f => ({ ...f, reason: e.target.value }))} /></div>
          {isAdmin ? (<>
            <label style={{ display: 'block' }}><input type="checkbox" checked={pf.policy_approved} onChange={e => setPf(f => ({ ...f, policy_approved: e.target.checked }))} /> Mark as Management-approved (activates rewards)</label>
            {pf.policy_approved && <div className="form-group"><label className="form-label">Management approval reference</label><input className="form-control" required value={pf.approval_reference} onChange={e => setPf(f => ({ ...f, approval_reference: e.target.value }))} /></div>}
          </>) : <p style={{ fontSize: '0.8rem' }}>Only an Administrator can mark the policy as Management-approved.</p>}
          <button className="btn btn-primary" disabled={busy}>Save new policy version</button>
          <h4 style={{ marginTop: '1rem' }}>Policy history</h4>
          <ul style={{ fontSize: '0.8rem' }}>{(policy?.history || []).map(h => <li key={h.id}>#{h.id} {h.created_at?.slice(0, 16).replace('T', ' ')} — {h.previous_reward_amount ? `${h.previous_reward_amount} → ` : ''}{h.reward_amount} USD, {h.policy_approved ? 'approved' : 'unapproved'} by {h.changed_by}: {h.reason}</li>)}</ul>
        </form>
      )}
    </div>
  );
}
