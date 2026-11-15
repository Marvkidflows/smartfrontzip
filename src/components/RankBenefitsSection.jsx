import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import RankBadge from './RankBadge';
import { rankService, apiError } from '../services/rankService';
import './RankBenefitsSection.css';

const usd = (n) => `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const STATUS_CLASS = { active: 'ok', subject_to_eligibility: 'elig', pending_approval: 'pend', suspended: 'off' };
const LOAN_STATUS = { submitted: 'Submitted', under_review: 'Under review', approved: 'Approved', rejected: 'Not approved', withdrawn: 'Withdrawn' };

function StatusTag({ b }) {
  // Text + shape, never colour alone.
  return <span className={`rb-tag rb-tag--${STATUS_CLASS[b.status]}`}>{b.status_label}</span>;
}

function BenefitList({ benefits, showApplies }) {
  return (
    <ul className="rb-list">
      {benefits.map((b) => (
        <li key={b.key} className="rb-item">
          <div className="rb-item__head">
            <strong>{b.title}</strong>
            <StatusTag b={b} />
          </div>
          <p>{b.description}</p>
          {b.note && <p className="rb-note">{b.note}</p>}
          {b.is_financial && <p className="rb-note">Financial incentive: not active. It never changes your contractual return unless SSI approves specific terms.</p>}
          {showApplies && !b.applies_to_you && <p className="rb-note">Unlocks at this rank.</p>}
        </li>
      ))}
    </ul>
  );
}

function Loans({ onChanged }) {
  const [state, setState] = useState(null);
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => rankService.myLoans().then((r) => setState(r.data)).catch(() => setState(null)), []);
  useEffect(() => { load(); }, [load]);
  if (!state || !state.visible) return null;

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { const r = await rankService.applyLoan({ requested_amount: Number(amount), purpose }); setState(r.data); setAmount(''); setPurpose(''); toast.success('Application submitted.'); onChanged?.(); }
    catch (err) { toast.error(apiError(err, 'Could not submit the application.')); }
    finally { setBusy(false); }
  };
  const withdraw = async (id) => {
    try { setState((await rankService.withdrawLoan(id)).data); } catch (err) { toast.error(apiError(err, 'Could not withdraw.')); }
  };

  return (
    <section className="card rb-loans" aria-labelledby="rb-loan-title">
      <h4 id="rb-loan-title">Loan applications</h4>
      <p className="rb-note" role="note">{state.disclaimer} The currency and terms of any facility are set by SSI’s approved lending policy.</p>
      {state.eligible ? (
        <form onSubmit={submit} className="rb-form">
          <label>Amount requested
            <input type="number" min="1" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label>Purpose (optional)
            <textarea rows={2} maxLength={1000} value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          </label>
          <button type="submit" className="rb-btn" disabled={busy || !amount}>{busy ? 'Submitting…' : 'Apply for consideration'}</button>
        </form>
      ) : <p className="rb-note">{state.reason}</p>}
      {state.applications.length > 0 && (
        <ul className="rb-list">
          {state.applications.map((a) => (
            <li key={a.id} className="rb-item">
              <div className="rb-item__head"><strong>{a.reference}</strong><span className="rb-tag rb-tag--elig">{LOAN_STATUS[a.status]}</span></div>
              <p>{Number(a.requested_amount).toLocaleString('en-US', { maximumFractionDigits: 2 })} requested · {new Date(a.created_at).toLocaleDateString()}</p>
              <ol className="rb-timeline">{a.timeline.map((t, i) => <li key={i}>{LOAN_STATUS[t.event]} — {new Date(t.at).toLocaleString()}</li>)}</ol>
              {a.approved_terms && <p><strong>Approved terms:</strong> {a.approved_terms}</p>}
              {a.decision_reason && <p><strong>Reason:</strong> {a.decision_reason}</p>}
              {['submitted', 'under_review'].includes(a.status) && <button type="button" className="rb-btn rb-btn--ghost" onClick={() => withdraw(a.id)}>Withdraw application</button>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function RankBenefitsSection() {
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading');
  const [open, setOpen] = useState(null);

  const load = useCallback(() => rankService.myBenefits()
    .then((r) => { setData(r.data); setState('ready'); setOpen((o) => o ?? r.data.current_rank_key ?? r.data.ranks[0]?.key); })
    .catch(() => setState('error')), []);
  useEffect(() => { load(); }, [load]);

  const toggleConsent = async (e) => {
    try { await rankService.setConsent(e.target.checked); await load(); toast.success(e.target.checked ? 'Consent recorded.' : 'Consent withdrawn.'); }
    catch (err) { toast.error(apiError(err, 'Could not save your choice.')); }
  };

  if (state === 'loading') return <div className="skeleton" style={{ height: 120 }} aria-busy="true" />;
  if (state === 'error') return <div className="inv-empty"><p>Rank benefits could not be loaded right now.</p></div>;

  const mine = data.ranks.filter((r) => r.benefits.some((b) => b.applies_to_you))
    .flatMap((r) => r.benefits.filter((b) => b.applies_to_you));
  const available = mine.filter((b) => ['active', 'subject_to_eligibility'].includes(b.status));
  const notAvailable = mine.filter((b) => ['pending_approval', 'suspended'].includes(b.status));

  return (
    <section className="inv-section rb" aria-labelledby="rb-title">
      <div className="inv-section__header"><h3 id="rb-title">Rank Benefits &amp; Privileges</h3></div>
      <p className="rank-crit__intro">{data.notice}</p>

      {!data.current_rank_key && <p className="rb-note">You do not hold a rank yet. All six ranks and their benefits are shown below so you can see what to work toward.</p>}
      {data.rank_status !== 'active' && <p className="rb-note">Your rank is currently {data.rank_status}, so rank benefits are not applied.</p>}

      {data.current_rank_key && (
        <>
          <div className="card rb-block"><h4>Available to you</h4>
            {available.length ? <BenefitList benefits={available} /> : <p className="rb-note">No benefits are available yet.</p>}
          </div>
          <div className="card rb-block"><h4>Pending approval or unavailable</h4>
            {notAvailable.length ? <BenefitList benefits={notAvailable} /> : <p className="rb-note">Nothing is pending.</p>}
          </div>
        </>
      )}

      <div className="card rb-block">
        <h4>Optional recognition</h4>
        <label className="rb-check">
          <input type="checkbox" checked={!!data.consent.recognition_communications} onChange={toggleConsent} />
          <span>I agree to be recognised (by rank) in private investor communications. I can withdraw this at any time.</span>
        </label>
      </div>

      <h4 className="rb-h">All ranks</h4>
      <div className="rb-ranks">
        {data.ranks.map((r) => (
          <div key={r.key} className={`card rb-rank ${r.is_current ? 'is-current' : ''}`}>
            <button type="button" className="rb-rank__head" aria-expanded={open === r.key} onClick={() => setOpen(open === r.key ? null : r.key)}>
              <RankBadge rank={r} size="md" />
              {r.is_current && <span className="rank-crit__you">Your rank</span>}
              <span className="rb-chev" aria-hidden="true">{open === r.key ? '−' : '+'}</span>
            </button>
            {open === r.key && (
              <div className="rb-rank__body">
                <BenefitList benefits={r.benefits} showApplies />
                {r.roi_treatment && <p className="rb-note"><strong>Return treatment:</strong> {r.roi_treatment}</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      <Loans onChanged={load} />

      <h4 className="rb-h">Rank history</h4>
      {data.history.length ? (
        <ul className="rb-list">
          {data.history.map((h, i) => (
            <li key={i} className="rb-item rb-hist">
              <span>{new Date(h.date).toLocaleDateString()}</span> <strong>{h.event}</strong>
              {h.previous_rank && <RankBadge rank={h.previous_rank} size="sm" />}{h.previous_rank && h.new_rank && ' → '}
              {h.new_rank && <RankBadge rank={h.new_rank} size="sm" />}
            </li>
          ))}
        </ul>
      ) : <p className="rb-note">No rank changes yet.</p>}
    </section>
  );
}
