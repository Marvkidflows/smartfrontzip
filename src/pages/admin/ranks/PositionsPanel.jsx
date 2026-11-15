import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import ReasonModal from './ReasonModal';
import { rankService, apiError } from '../../../services/rankService';

const STATUS = { active: 'Active', completed_verified: 'Completed — verified', completed_pending_verification: 'Completed — pending verification', cancelled: 'Cancelled', under_review: 'Under review' };
const KIND = { release: 'Principal released', return_to_wallet: 'Returned to wallet', external_payout: 'Paid out externally', withdrawal_principal: 'Withdrawal principal', correction: 'Correction' };
const money = (n) => Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const newKey = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`).slice(0, 40);

// Position-level principal handling for one investor (Financial Team decisions, 27 Oct 2026). Redemptions name a POSITION; the account-level
// "oldest first" fallback is not approved and does not exist. The server validates and audits every action.
export default function PositionsPanel({ investorId }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [modal, setModal] = useState(null);
  const [extra, setExtra] = useState({});
  const [busy, setBusy] = useState(false);
  const [mErr, setMErr] = useState('');
  const keyRef = useRef(newKey());

  const load = useCallback(() => rankService.positions(investorId).then((r) => { setD(r.data); setErr(''); }).catch((e) => setErr(apiError(e, 'Positions could not be loaded.'))), [investorId]);
  useEffect(() => { load(); }, [load]);

  const ask = (cfg) => { keyRef.current = newKey(); setExtra(cfg.init || {}); setMErr(''); setModal(cfg); };
  const confirm = async (reason) => {
    setBusy(true); setMErr('');
    try { await modal.run(reason, extra, keyRef.current); setModal(null); toast.success('Saved.'); await load(); }
    catch (e) { setMErr(apiError(e, 'Could not save.')); }
    finally { setBusy(false); }
  };
  const field = (name, label, type = 'text', options = []) => (
    <div key={name}><label className="rk-label" htmlFor={`pf-${name}`}>{label}</label>
      {type === 'select'
        ? <select id={`pf-${name}`} className="rk-input" value={extra[name] ?? ''} onChange={(e) => setExtra({ ...extra, [name]: e.target.value })}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        : <input id={`pf-${name}`} className="rk-input" type={type} value={extra[name] ?? ''} onChange={(e) => setExtra({ ...extra, [name]: e.target.value })} />}
    </div>
  );

  if (err) return <p className="rk-muted" role="status">{err}</p>;
  if (!d) return <div className="skeleton" style={{ height: 80 }} aria-busy="true" />;

  const redeem = (p, mode) => ask({
    title: `${mode === 'return' ? 'Return principal to wallet' : 'Record external principal payout'} — ${p.reference}`, confirmLabel: 'Record',
    intro: `Remaining principal: ${money(p.remaining_principal)}. Position-specific; cannot exceed what remains. A transaction reference and supporting evidence are required.`,
    fields: [['amount', 'Principal amount actually redeemed', 'number'], ['reference', mode === 'return' ? 'Ledger/transaction reference' : 'Payout reference'], ['evidence', 'Supporting evidence']],
    run: (reason, x, key) => (mode === 'return' ? rankService.returnPrincipal : rankService.payoutPrincipal)(p.id, { amount: Number(x.amount), idempotency_key: key, reference: x.reference || '', evidence: x.evidence || reason }),
  });
  const flag = (p) => ask({ title: `Flag ${p.reference}`, confirmLabel: 'Set flag', intro: 'A flagged position is excluded from rank eligibility (principal and cycle) until the flag is cleared.', init: { flag_type: 'under_review' },
    fields: [['flag_type', 'Flag', 'select', [['disputed', 'Disputed'], ['reversed', 'Reversed'], ['under_review', 'Under review']]]], run: (reason, x) => rankService.flagPosition(p.id, { flag_type: x.flag_type, reason }) });
  const unflag = (p) => ask({ title: `Clear the flag on ${p.reference}`, confirmLabel: 'Clear flag', fields: [], run: (reason) => rankService.unflagPosition(p.id, { reason }) });
  const release = (p) => ask({ title: `Release principal — ${p.reference}`, confirmLabel: 'Record release', intro: 'Records that the principal has become eligible for settlement. It credits nothing and pays nothing.', fields: [], run: (reason) => rankService.releasePrincipal(p.id, { note: reason }) });
  const correct = (p) => ask({ title: `Approved principal correction — ${p.reference}`, confirmLabel: 'Record correction', intro: 'Positive reduces principal, negative restores it. Needs an approval reference and evidence.',
    fields: [['signed_amount', 'Signed amount', 'number'], ['approval_reference', 'Approval reference']], run: (reason, x, key) => rankService.correctPrincipal(p.id, { signed_amount: Number(x.signed_amount), idempotency_key: key, approval_reference: x.approval_reference || '', evidence: reason }) });
  const classify = (w) => ask({
    title: `Classify withdrawal #${w.id} (${money(w.amount)})`, confirmLabel: 'Save classification', required: false,
    intro: 'Split the withdrawal into principal from a NAMED position and verified profit. The components must add up to the withdrawal. Nothing reduces principal until the withdrawal is approved and processed.',
    init: { investment_id: String(d.positions[0]?.id ?? '') },
    fields: [['investment_id', 'Position (for the principal component)', 'select', d.positions.filter((p) => p.status !== 'cancelled').map((p) => [String(p.id), `${p.reference} — remaining ${money(p.remaining_principal)}`])],
             ['principal', 'Principal amount (0 if none)', 'number'], ['profit', 'Profit amount (0 if none)', 'number'], ['profit_note', 'Evidence that the profit is available for withdrawal']],
    run: (reason, x) => {
      const components = [];
      if (Number(x.principal) > 0) components.push({ component: 'principal', amount: Number(x.principal), investment_id: Number(x.investment_id) });
      if (Number(x.profit) > 0) components.push({ component: 'profit', amount: Number(x.profit), verification_note: x.profit_note || '' });
      return rankService.classifyWithdrawal(w.id, { components });
    },
  });

  const s = d.summary;
  return (
    <section className="rk-table-wrap" style={{ marginTop: '1.25rem' }} aria-labelledby="pos-title">
      <h3 id="pos-title">Positions &amp; principal</h3>
      {!d.enabled && <div className="rk-banner rk-banner--warn" role="status">The principal ledger is not enabled in this environment, so principal actions are unavailable. Figures below are still read from the records.</div>}
      <p className="rk-muted">
        Current eligible principal (verified): <strong>${money(s.current_eligible_principal)}</strong> · historical verified total (reporting only): ${money(s.historical_total_usd)} ·
        completed cycles: {s.completed_cycles} · calculated {new Date(s.calculated_at).toLocaleString()}
      </p>
      <div className="rk-table-wrap"><table className="rk-table">
        <thead><tr><th>Position</th><th>Status</th><th>Amount</th><th>Remaining principal</th><th>Counted (USD)</th><th>Notes</th><th>Actions</th></tr></thead>
        <tbody>
          {d.positions.length === 0 && <tr><td colSpan={7} className="rk-muted">No investment positions.</td></tr>}
          {d.positions.map((p) => (
            <tr key={p.id}>
              <td>{p.reference}<div className="rk-muted">{p.cycle_reference}</div></td>
              <td>{STATUS[p.derived_status] || p.status}{p.flag && <div className="rk-chip rk-chip--warn">{p.flag.type.replace('_', ' ')}</div>}</td>
              <td>{money(p.amount)}</td><td>{money(p.remaining_principal)}</td><td>{money(p.principal_usd_counted)}</td>
              <td>{[...p.exclusions, ...p.movements.map((m) => `${KIND[m.kind] || m.kind} ${money(m.amount)}`)].join('; ') || '—'}</td>
              <td><div className="rk-btn-row">
                {d.enabled && p.status === 'completed' && <button type="button" className="rk-btn rk-btn--sm" onClick={() => release(p)}>Release</button>}
                {d.enabled && p.status !== 'cancelled' && p.remaining_principal > 0 && <>
                  <button type="button" className="rk-btn rk-btn--sm" onClick={() => redeem(p, 'return')}>Return to wallet</button>
                  <button type="button" className="rk-btn rk-btn--sm" onClick={() => redeem(p, 'payout')}>External payout</button></>}
                {d.enabled && <button type="button" className="rk-btn rk-btn--sm" onClick={() => correct(p)}>Correct</button>}
                {p.flag ? <button type="button" className="rk-btn rk-btn--sm" onClick={() => unflag(p)}>Clear flag</button> : <button type="button" className="rk-btn rk-btn--sm" onClick={() => flag(p)}>Flag</button>}
              </div></td>
            </tr>
          ))}
        </tbody>
      </table></div>
      {d.enabled && d.pending_withdrawals.length > 0 && (
        <>
          <h4>Pending withdrawals</h4>
          <div className="rk-table-wrap"><table className="rk-table"><thead><tr><th>Withdrawal</th><th>Amount</th><th>Status</th><th>Classification</th></tr></thead>
            <tbody>{d.pending_withdrawals.map((w) => (
              <tr key={w.id}><td>#{w.id}</td><td>{money(w.amount)}</td><td>{w.status}</td>
                <td>{w.classified ? 'Classified' : <button type="button" className="rk-btn rk-btn--sm" onClick={() => classify(w)}>Classify</button>}</td></tr>
            ))}</tbody></table></div>
        </>
      )}
      {modal && <ReasonModal title={modal.title} intro={modal.intro} confirmLabel={modal.confirmLabel} required={modal.required !== false} busy={busy} error={mErr}
        extra={<>{(modal.fields || []).map(([n, l, t, o]) => field(n, l, t, o))}</>} onConfirm={confirm} onClose={() => setModal(null)} />}
    </section>
  );
}
