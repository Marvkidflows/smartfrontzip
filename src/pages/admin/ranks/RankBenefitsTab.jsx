import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import RankBadge from '../../../components/RankBadge';
import ReasonModal from './ReasonModal';
import { rankService, apiError } from '../../../services/rankService';
import { fmtDate } from './rankUtils';

const KIND = { fixed_bonus: 'Fixed bonus', percentage_bonus: 'Percentage bonus' };
const LOAN_NEXT = { submitted: ['review'], under_review: ['approve', 'reject'] };

export default function RankBenefitsTab() {
  const [d, setD] = useState(null);
  const [loan, setLoan] = useState(null);
  const [apps, setApps] = useState([]);
  const [hist, setHist] = useState([]);
  const [modal, setModal] = useState(null);   // { title, intro, confirmLabel, run(reason, extra), fields? }
  const [extra, setExtra] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState('bronze');

  const load = useCallback(async () => {
    try {
      const [b, l, a, h] = await Promise.all([rankService.benefits(), rankService.loanSettings().catch(() => null), rankService.loanApplications().catch(() => null), rankService.benefitHistory().catch(() => null)]);
      setD(b.data); setLoan(l?.data || null); setApps(a?.data?.data || []); setHist(h?.data?.data || []);
    } catch (e) { toast.error(apiError(e, 'Could not load benefits.')); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const ask = (cfg) => { setExtra(cfg.init || {}); setErr(''); setModal(cfg); };
  const confirm = async (reason) => {
    setBusy(true); setErr('');
    try { await modal.run(reason, extra); setModal(null); toast.success('Saved.'); await load(); }
    catch (e) { setErr(apiError(e, 'Could not save.')); }
    finally { setBusy(false); }
  };
  const field = (name, label, type = 'text', options = []) => (
    <div key={name}><label className="rk-label" htmlFor={`bf-${name}`}>{label}</label>
      {type === 'select'
        ? <select id={`bf-${name}`} className="rk-input" value={extra[name] ?? ''} onChange={(e) => setExtra({ ...extra, [name]: e.target.value })}>
            {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        : type === 'textarea'
        ? <textarea id={`bf-${name}`} className="rk-input" rows={3} value={extra[name] ?? ''} onChange={(e) => setExtra({ ...extra, [name]: e.target.value })} />
        : <input id={`bf-${name}`} className="rk-input" type={type} value={extra[name] ?? ''} onChange={(e) => setExtra({ ...extra, [name]: e.target.value })} />}
    </div>
  );

  if (!d) return <div className="skeleton" style={{ height: 160 }} aria-busy="true" />;
  const { abilities } = d;

  const editBenefit = (b) => ask({
    title: `Edit: ${b.title}`, intro: 'Wording, dates and visibility. Dates are inclusive; leave blank for none.', confirmLabel: 'Save changes',
    init: { title: b.title, description: b.description, effective_from: b.effective_from || '', effective_to: b.effective_to || '', is_published: b.is_published ? '1' : '0' },
    run: (reason, x) => rankService.updateBenefit(b.id, { reason, title: x.title ?? b.title, description: x.description ?? b.description,
      effective_from: (x.effective_from ?? b.effective_from) || null, effective_to: (x.effective_to ?? b.effective_to) || null, is_published: (x.is_published ?? (b.is_published ? '1' : '0')) === '1' }),
    fields: [['title', 'Title'], ['description', 'Description', 'textarea'], ['effective_from', 'Effective from', 'date'], ['effective_to', 'Effective to', 'date']],
  });
  const setStatus = (b, status, needsRef) => ask({
    title: `${status === 'suspended' ? 'Suspend' : status === 'pending_approval' ? 'Return to pending' : 'Enable'}: ${b.title}`,
    intro: needsRef ? 'Switching this on requires the reference of the written SSI management approval.' : 'The record and its history are kept.',
    confirmLabel: 'Confirm', run: (reason, x) => rankService.setBenefitStatus(b.id, { status, reason, approval_reference: x.approval_reference || undefined }),
    fields: needsRef ? [['approval_reference', 'Approval reference']] : [],
  });
  const policyForm = (topic, status) => ask({
    title: `${status === 'confirmed' ? 'Record' : 'Revoke'} sign-off: ${topic.label}`, confirmLabel: status === 'confirmed' ? 'Record sign-off' : 'Revoke',
    intro: 'Record this only when the written approval exists. The reference is mandatory and the action is audited.',
    run: (reason, x) => rankService.recordPolicy({ topic: topic.topic, status, approval_reference: x.approval_reference || '', note: reason }),
    fields: [['approval_reference', 'Reference of the written approval']],
  });
  const incentiveForm = () => ask({
    title: 'New incentive term (draft)', intro: 'No value is ever pre-filled. This is a record only; it does not change any payout or contractual return.', confirmLabel: 'Create draft',
    init: { rank: String(d.ranks[0].id), kind: 'fixed_bonus' },
    run: (reason, x) => rankService.createIncentive({ reason, label: x.label, investor_rank_id: Number(x.rank), kind: x.kind || 'fixed_bonus', value: x.value ? Number(x.value) : null, conditions: x.conditions || null, effective_from: x.effective_from || null, effective_to: x.effective_to || null }),
    fields: [['label', 'Label'], ['rank', 'Rank', 'select', d.ranks.map((r) => [String(r.id), r.name])], ['kind', 'Type', 'select', [['fixed_bonus', 'Fixed bonus'], ['percentage_bonus', 'Percentage bonus']]], ['value', 'Value set by Management', 'number'], ['conditions', 'Conditions', 'textarea'], ['effective_from', 'Effective from', 'date'], ['effective_to', 'Effective to', 'date']],
  });
  const incentiveAct = (t, action, label, needsRef) => ask({
    title: `${label}: ${t.label}`, confirmLabel: label, intro: needsRef ? 'Enter the reference of the written management approval. A different person from the author must approve.' : '',
    run: (reason, x) => rankService.incentiveAction(t.id, action, { reason, approval_reference: x.approval_reference || undefined }),
    fields: needsRef ? [['approval_reference', 'Approval reference']] : [],
  });
  const loanAct = (a, action) => ask({
    title: `${action[0].toUpperCase() + action.slice(1)} ${a.reference}`, confirmLabel: action === 'review' ? 'Start review' : action === 'approve' ? 'Approve' : 'Reject',
    intro: action === 'approve' ? 'Write the terms as agreed under the approved lending policy. The system holds no rates, limits or schedules.' : '', required: action !== 'review',
    run: (reason, x) => rankService.loanAction(a.id, action, action === 'review' ? { note: reason || undefined } : action === 'approve' ? { reason, approved_terms: x.approved_terms || '' } : { reason }),
    fields: action === 'approve' ? [['approved_terms', 'Approved terms', 'textarea']] : [],
  });
  const loanSetting = (patch, title) => ask({ title, confirmLabel: 'Confirm', run: (reason, x) => rankService.saveLoanSettings({ ...patch, reason, ...(x.policy_reference ? { policy_reference: x.policy_reference } : {}) }), fields: patch.is_authorized ? [['policy_reference', 'Approved lending policy reference']] : [] });

  return (
    <div>
      <div className="rk-banner rk-banner--warn">
        <strong>Management approval controls.</strong> Financial incentives and loan advantages are inactive until approved in writing. No percentage, rate or limit is pre-set.
      </div>

      <div className="rk-toolbar">
        {Object.entries(d.status_labels).map(([k, l]) => <span key={k} className="rk-muted">{l}: <strong>{d.counts[k]}</strong></span>)}
        <span className="rk-muted">Investors consenting to recognition: <strong>{d.consenting_investors}</strong></span>
        {abilities.export && <>
          <button type="button" className="rk-btn rk-btn--sm" onClick={() => rankService.exportBenefits('benefits')}>Export benefits CSV</button>
          <button type="button" className="rk-btn rk-btn--sm" onClick={() => rankService.exportBenefits('consents')}>Export consents CSV</button></>}
      </div>

      <div className="rk-banner rk-banner--info">
        <strong>Board decision (Option B): the monetary rank threshold uses current verified eligible principal; reinvested capital counts only once the new investment is verified and activated; a cycle counts only when completed and verified.</strong>
        <p className="rk-muted">The rules listed below describe what the rank engine does today while the Financial controls are off (the default). They have not yet been switched to the Board&apos;s decision. Account-level redemption and rank-to-product or reinvestment options remain pending Management approval.</p>
        <ul>{d.calculation_policy.rules.map((r) => <li key={r.topic}><strong>{r.topic}:</strong> {r.behaviour}</li>)}</ul>
      </div>

      <div className={`rk-banner ${d.principal_policy.allows_activation ? 'rk-banner--info' : 'rk-banner--warn'}`}>
        <strong>Rank measure: Current eligible principal (verified).</strong> {d.principal_policy.measure}
        <p className="rk-muted">
          A rank rule that measures money can be activated only when the Financial controls are on in this environment
          (separate deposit approval: <strong>{d.principal_policy.flags.separate_deposit_approval ? 'on' : 'off'}</strong>; wallet &amp; principal ledger: <strong>{d.principal_policy.flags.ledger_enabled ? 'on' : 'off'}</strong>)
          and both formal sign-offs are recorded. Cryptocurrency valuation: <strong>{d.principal_policy.flags.crypto_rank_valuation_enabled ? 'on' : 'disabled'}</strong>; live exchange-rate provider: <strong>{d.principal_policy.flags.live_fx_enabled ? 'on' : 'disabled'}</strong>.
        </p>
        <ul>
          {d.principal_policy.topics.map((t) => (
            <li key={t.topic}>{t.label}: {t.confirmed ? `recorded (ref ${t.approval_reference}, ${t.decided_by_name})` : 'not recorded'}
              {abilities.confirm_policy && (t.confirmed
                ? <> <button type="button" className="rk-btn rk-btn--sm" onClick={() => policyForm(t, 'revoked')}>Revoke</button></>
                : <> <button type="button" className="rk-btn rk-btn--sm" onClick={() => policyForm(t, 'confirmed')}>Record</button></>)}
            </li>
          ))}
        </ul>
        <details><summary>Still pending formal approval</summary><ul>{d.principal_policy.pending_formal_approval.map((t) => <li key={t}>{t}</li>)}</ul></details>
      </div>

      <h3>Benefits by rank</h3>
      {d.ranks.map((r) => (
        <div key={r.key} className="rk-table-wrap" style={{ marginBottom: '0.75rem' }}>
          <button type="button" className="rk-btn" style={{ width: '100%', textAlign: 'left' }} aria-expanded={open === r.key} onClick={() => setOpen(open === r.key ? null : r.key)}>
            <RankBadge rank={r} size="sm" /> <span className="rk-muted">{r.benefits.length} benefits</span>
          </button>
          {open === r.key && (
            <table className="rk-table">
              <thead><tr><th>Benefit</th><th>Status</th><th>Delivered by</th><th>Effective</th><th>Approval</th><th>Actions</th></tr></thead>
              <tbody>{r.benefits.map((b) => (
                <tr key={b.id}>
                  <td><strong>{b.title}</strong>{b.is_financial && ' (financial)'}{!b.is_published && ' (hidden)'}<div className="rk-muted">{b.description}</div></td>
                  <td>{b.status_label}</td>
                  <td>{b.fulfilment === 'future_feature' ? 'Feature not built yet' : b.fulfilment === 'platform' ? 'Platform' : 'SSI staff'}</td>
                  <td>{b.effective_from ? fmtDate(b.effective_from) : '—'} → {b.effective_to ? fmtDate(b.effective_to) : '—'}</td>
                  <td>{b.approval_reference ? `${b.approval_reference} (${b.approved_by_name})` : '—'}</td>
                  <td>{abilities.manage && <div className="rk-btn-row">
                    <button type="button" className="rk-btn rk-btn--sm" onClick={() => editBenefit(b)}>Edit</button>
                    {b.status !== 'suspended' && <button type="button" className="rk-btn rk-btn--sm" onClick={() => setStatus(b, 'suspended')}>Suspend</button>}
                    {b.status === 'suspended' && <button type="button" className="rk-btn rk-btn--sm" onClick={() => setStatus(b, 'pending_approval')}>Return to pending</button>}
                    {!b.is_financial && abilities.approve && b.status !== 'active' && <button type="button" className="rk-btn rk-btn--sm rk-btn--primary" onClick={() => setStatus(b, 'active', b.requires_approval)}>Enable</button>}
                  </div>}</td>
                </tr>))}</tbody>
            </table>
          )}
        </div>
      ))}

      <h3>Incentive terms (configurable, inactive)</h3>
      <p className="rk-muted">Activation switch: <strong>{d.incentives_activation_enabled ? 'ON' : 'OFF (management decision)'}</strong>. Lifecycle: draft → pending approval → approved (different person, written reference) → active.</p>
      {abilities.manage && <button type="button" className="rk-btn rk-btn--sm" onClick={incentiveForm}>New draft term</button>}
      <div className="rk-table-wrap"><table className="rk-table">
        <thead><tr><th>Label</th><th>Rank</th><th>Type / value</th><th>Status</th><th>Approval</th><th>Actions</th></tr></thead>
        <tbody>
          {d.incentives.length === 0 && <tr><td colSpan={6} className="rk-muted">No incentive terms exist. None are active.</td></tr>}
          {d.incentives.map((t) => (
            <tr key={t.id}><td>{t.label}</td><td>{t.rank && <RankBadge rank={t.rank} size="sm" />}</td><td>{KIND[t.kind]} {t.value ?? '—'}</td><td>{t.status.replace('_', ' ')}</td>
              <td>{t.approval_reference || '—'}</td>
              <td><div className="rk-btn-row">
                {t.status === 'draft' && abilities.manage && <button type="button" className="rk-btn rk-btn--sm" onClick={() => incentiveAct(t, 'submit', 'Submit for approval')}>Submit</button>}
                {t.status === 'pending_approval' && abilities.approve && <button type="button" className="rk-btn rk-btn--sm" onClick={() => incentiveAct(t, 'approve', 'Approve', true)}>Approve</button>}
                {t.status === 'approved' && abilities.approve && <button type="button" className="rk-btn rk-btn--sm rk-btn--primary" onClick={() => incentiveAct(t, 'activate', 'Activate')}>Activate</button>}
                {t.status !== 'disabled' && abilities.manage && <button type="button" className="rk-btn rk-btn--sm" onClick={() => incentiveAct(t, 'disable', 'Disable')}>Disable</button>}
              </div></td></tr>))}
        </tbody></table></div>

      {loan && (
        <>
          <h3>Diamond &amp; Elite loan programme</h3>
          {loan.settings.locked && (
            <div className="rk-banner rk-banner--warn" role="status">
              <strong>Lending is locked.</strong> The Board has not authorised any lending programme. Applications, reviews, decisions and configuration are refused by the server and no loan content is shown to investors. Unlocking requires the Board’s separate written authorisation and an approved lending policy.
            </div>
          )}
          <p>Authorised: <strong>{loan.settings.is_authorized ? 'Yes' : 'No'}</strong> · Open to applications: <strong>{loan.settings.is_active ? 'Yes' : 'No'}</strong> · Policy reference: {loan.settings.policy_reference || '—'}</p>
          {loan.can_configure && !loan.settings.locked && <div className="rk-btn-row">
            {!loan.settings.is_authorized && <button type="button" className="rk-btn rk-btn--sm" onClick={() => loanSetting({ is_authorized: true }, 'Authorise the lending programme')}>Authorise</button>}
            {loan.settings.is_authorized && !loan.settings.is_active && <button type="button" className="rk-btn rk-btn--sm rk-btn--primary" onClick={() => loanSetting({ is_active: true }, 'Open to applications')}>Open applications</button>}
            {loan.settings.is_active && <button type="button" className="rk-btn rk-btn--sm" onClick={() => loanSetting({ is_active: false }, 'Close applications')}>Close applications</button>}
            {loan.settings.is_authorized && <button type="button" className="rk-btn rk-btn--sm rk-btn--danger" onClick={() => loanSetting({ is_authorized: false }, 'Withdraw authorisation')}>Withdraw authorisation</button>}
          </div>}
          <div className="rk-table-wrap"><table className="rk-table">
            <thead><tr><th>Ref</th><th>Investor</th><th>Rank</th><th>Requested</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {apps.length === 0 && <tr><td colSpan={6} className="rk-muted">No applications.</td></tr>}
              {apps.map((a) => (
                <tr key={a.id}><td>{a.reference}</td><td>{a.investor_name}<div className="rk-muted">{a.account_id}</div></td><td>{a.rank && <RankBadge rank={a.rank} size="sm" />}</td>
                  <td>{Number(a.requested_amount).toLocaleString('en-US', { maximumFractionDigits: 2 })}</td><td>{a.status.replace('_', ' ')}</td>
                  <td>{loan.can_decide && !loan.settings.locked && <div className="rk-btn-row">{(LOAN_NEXT[a.status] || []).map((act) => <button key={act} type="button" className="rk-btn rk-btn--sm" onClick={() => loanAct(a, act)}>{act}</button>)}</div>}</td></tr>))}
            </tbody></table></div>
        </>
      )}

      <h3>Recent benefit audit trail</h3>
      <div className="rk-table-wrap"><table className="rk-table">
        <thead><tr><th>When</th><th>Subject</th><th>Action</th><th>By</th><th>Reason</th></tr></thead>
        <tbody>{hist.map((h) => <tr key={h.id}><td>{fmtDate(h.created_at)}</td><td>{h.subject_type} #{h.subject_id ?? '—'}</td><td>{h.action}</td><td>{h.actor_name}</td><td>{h.reason}</td></tr>)}</tbody>
      </table></div>

      {modal && (
        <ReasonModal title={modal.title} intro={modal.intro} confirmLabel={modal.confirmLabel} required={modal.required !== false} busy={busy} error={err}
          extra={<>{(modal.fields || []).map(([n, l, t, o]) => field(n, l, t, o))}</>} onConfirm={confirm} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
