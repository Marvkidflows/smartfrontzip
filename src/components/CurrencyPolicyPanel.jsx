import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { rankService, apiError } from '../services/rankService';
import useAuthStore from '../store/authStore';
import '../pages/admin/ranks/AdminRanks.css';

const STATE = {
  unconfirmed:          { label: 'Not confirmed',          tone: 'bad',  text: 'Money-based criteria cannot be activated. Step 1: the Financial Team reviews the rules below. Step 2: an Administrator confirms them on behalf of SSI Management.' },
  pending_confirmation: { label: 'Reviewed — awaiting confirmation', tone: 'warn', text: 'The Financial Team has reviewed the rules. An Administrator must now confirm them before money-based criteria can be activated.' },
  confirmed:            { label: 'Confirmed',              tone: 'ok',   text: 'Money-based criteria can be activated.' },
  stale:                { label: 'Changed since confirmed', tone: 'bad', text: 'The currency rules changed after the last confirmation, so it no longer applies. They must be reviewed and confirmed again.' },
  revoked:              { label: 'Withdrawn',              tone: 'bad',  text: 'The confirmation was withdrawn. Money-based criteria cannot be activated until a new review and confirmation are recorded. Existing investor ranks are unchanged.' },
};
const fmtWhen = (d) => (d ? new Date(d).toLocaleString() : '—');

// Shows the blockers returned by the server when a money criterion cannot be activated, with a direct link to fix them.
export function CurrencyGateNotice({ gate, buttonOnly = false }) {
  if (!gate?.blockers?.length) return null;
  return (
    <div className="rk-banner rk-banner--bad" role="alert">
      {gate.blockers.map((b, i) => (
        <div key={i} style={{ marginBottom: 6 }}>
          {!buttonOnly && <div>{b.message}</div>}
          {b.action?.path && <Link className="rk-btn rk-btn--sm rk-btn--primary" style={{ marginTop: 6, display: 'inline-block' }} to={b.action.path}>{b.action.label || 'Open'}</Link>}
        </div>
      ))}
    </div>
  );
}

// Currency policy: what Management is asked to confirm, who reviewed/confirmed it, and the actions each role may take.
export default function CurrencyPolicyPanel({ onChanged }) {
  const role = useAuthStore((s) => s.user?.role);
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [confirmNote, setConfirmNote] = useState('');
  const [handling, setHandling] = useState('');
  const [ack, setAck] = useState('');
  const [revokeReason, setRevokeReason] = useState('');

  const load = useCallback(async () => {
    try {
      const [p, h] = await Promise.all([rankService.currencyPolicy(), rankService.currencyPolicyHistory()]);
      setData(p.data); setHistory(h.data.data || []);
    } catch (e) { toast.error(apiError(e, 'Could not load the currency policy.')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (fn, after) => {
    setBusy(true); setErr('');
    try { const r = await fn(); toast.success(r.data.message); after?.(); await load(); onChanged?.(); }
    catch (e) { setErr(apiError(e)); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="adm-empty">Loading currency policy…</div>;
  if (!data) return <div className="adm-empty">The currency policy could not be loaded.</div>;

  const st = STATE[data.state] || STATE.unconfirmed;
  const needs = data.records?.needs_review || 0;
  const pending = data.pending;
  const sameReviewer = data.requires_separate_confirmer && pending && pending.reviewed_by_id === data.viewer_id;
  const canConfirmNow = data.can_confirm && data.state === 'pending_confirmation' && pending?.rules_match_current;
  const needsAck = handling === 'accept_exclusions' && needs > 0;
  const rules = data.rules || {};

  return (
    <div>
      <div className={`rk-banner rk-banner--${st.tone === 'ok' ? 'info' : st.tone === 'warn' ? 'warn' : 'bad'}`} role="status">
        <strong>Currency policy: {st.label}</strong>{data.current?.version ? ` · version ${data.current.version}` : ''}
        <div>{st.text}</div>
        {data.state === 'confirmed' && data.current && (
          <div className="rk-muted">Confirmed by {data.current.confirmed_by} on {fmtWhen(data.current.confirmed_at)} (reviewed by {data.current.reviewed_by}).
            Records without a verified USD value: {data.current.unverified_handling === 'require_clear' ? 'must be cleared before a money criterion is activated' : `accepted as excluded (${data.current.accepted_review_count} at confirmation; they count as 0)`}.</div>
        )}
      </div>

      <section className="rk-crit-card" aria-label="Rules to be confirmed">
        <h3 style={{ marginTop: 0 }}>The rules Management is asked to confirm</h3>
        <p className="rk-muted">These are the rules the system applies today. Nothing is assumed: an amount is never treated as {data.ranking_currency} until a person verifies it.</p>
        <ul>
          <li><strong>Ranking currency:</strong> {rules.ranking_currency}</li>
          <li><strong>Conversion:</strong> {rules.conversion}</li>
          <li><strong>A non-{rules.ranking_currency} amount needs:</strong> {(rules.non_usd_requires || []).join('; ')}.</li>
          <li><strong>Left out of every total:</strong>
            <ul>{(rules.excluded_from_totals || []).map((t) => <li key={t}>{t}</li>)}</ul>
          </li>
          <li><strong>Measures kept separate:</strong>
            <ul>{Object.entries(rules.measures || {}).map(([k, v]) => <li key={k}>{v}</li>)}</ul>
          </li>
          <li className="rk-muted">Safety checks: rate may differ ≤ {rules.rate_deviation_percent}% from the last recorded rate; rate date within {rules.rate_date_tolerance_days} days of the record; approved deposit within {rules.approved_amount_tolerance_percent}% of amount × rate; duplicates = same investor/plan/amount/start within {rules.duplicate_window_seconds}s.</li>
        </ul>
      </section>

      <section className="rk-crit-card" aria-label="Records needing review">
        <h3 style={{ marginTop: 0 }}>Records still without a verified {data.ranking_currency} value</h3>
        {needs === 0 ? <p className="rk-muted">None — every investment and approved deposit has a verified value.</p> : (
          <>
            <p><strong>{needs.toLocaleString()}</strong> record(s) need attention and currently count as 0:</p>
            <ul>
              <li>Investments with no verified value: {data.records.investments.unverified}</li>
              <li>Investments changed since verification: {data.records.investments.stale}</li>
              <li>Investments that look like duplicates: {data.records.investments.duplicate_suspects}</li>
              <li>Approved deposits with no verified value: {data.records.deposits.unverified}</li>
              <li>Approved deposits changed since verification: {data.records.deposits.stale}</li>
            </ul>
            {data.affected_sample && <div className="rk-muted">First affected record ids — {Object.entries(data.affected_sample).filter(([, v]) => v.length).map(([k, v]) => `${k.replace('_', ' ')}: #${v.join(', #')}`).join(' · ')}</div>}
            {role === 'admin'
              ? <Link className="rk-btn rk-btn--sm" style={{ marginTop: 8, display: 'inline-block' }} to="/admin/ranks/currency">Open the review queue</Link>
              : <div className="rk-muted">Work these in the verification queue below.</div>}
          </>
        )}
      </section>

      {err && <div className="rk-error" role="alert">{err}</div>}

      {data.can_review && data.state !== 'confirmed' && (
        <section className="rk-crit-card" aria-label="Step 1 review">
          <h3 style={{ marginTop: 0 }}>Step 1 — Record the Financial review</h3>
          <p className="rk-muted">Confirm you have read the rules above and checked the review queue. This does not unlock anything by itself.</p>
          <label className="rk-label" htmlFor="cp-review">What did you review? (at least 10 characters)</label>
          <textarea id="cp-review" className="rk-input" rows={3} maxLength={1000} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} />
          <button className="rk-btn rk-btn--primary" disabled={busy || reviewNote.trim().length < 10}
            onClick={() => act(() => rankService.currencyPolicyReview({ note: reviewNote.trim() }), () => setReviewNote(''))}>
            {busy ? 'Saving…' : 'Record review'}
          </button>
        </section>
      )}

      {data.state === 'pending_confirmation' && pending && (
        <section className="rk-crit-card" aria-label="Step 2 confirmation">
          <h3 style={{ marginTop: 0 }}>Step 2 — Administrator confirmation</h3>
          <p className="rk-muted">Reviewed by {pending.reviewed_by} on {fmtWhen(pending.reviewed_at)} (version {pending.version}): “{pending.review_note}”</p>
          {!data.can_confirm && <div className="rk-banner rk-banner--info">Only an Administrator can confirm. Ask an Administrator to open Investor Ranks → Currency policy.</div>}
          {data.can_confirm && sameReviewer && <div className="rk-banner rk-banner--warn">You recorded this review, so another Administrator must confirm it.</div>}
          {canConfirmNow && !sameReviewer && (
            <>
              <div className="rk-banner rk-banner--warn"><strong>You are confirming on behalf of SSI Management.</strong> Only continue if Management has decided to adopt these rules.</div>
              <fieldset style={{ border: 0, padding: 0 }}>
                <legend className="rk-label">How should records without a verified value be treated? (required)</legend>
                <label style={{ display: 'block' }}><input type="radio" name="cp-handling" value="accept_exclusions" checked={handling === 'accept_exclusions'} onChange={(e) => setHandling(e.target.value)} /> Accept that they count as 0 and are listed for Financial to work through</label>
                <label style={{ display: 'block' }}><input type="radio" name="cp-handling" value="require_clear" checked={handling === 'require_clear'} onChange={(e) => setHandling(e.target.value)} /> Require the queue to be cleared before any money criterion can be activated</label>
              </fieldset>
              {needsAck && (
                <>
                  <label className="rk-label" htmlFor="cp-ack">Type the number of records being accepted as excluded ({needs})</label>
                  <input id="cp-ack" className="rk-input" inputMode="numeric" value={ack} onChange={(e) => setAck(e.target.value.replace(/\D/g, ''))} />
                </>
              )}
              <label className="rk-label" htmlFor="cp-note">Management decision being recorded (at least 10 characters)</label>
              <textarea id="cp-note" className="rk-input" rows={3} maxLength={1000} value={confirmNote} onChange={(e) => setConfirmNote(e.target.value)} />
              <button className="rk-btn rk-btn--primary" disabled={busy || !handling || confirmNote.trim().length < 10 || (needsAck && ack === '')}
                onClick={() => act(() => rankService.currencyPolicyConfirm({
                  note: confirmNote.trim(), unverified_handling: handling, ...(needsAck ? { acknowledged_review_count: Number(ack) } : {}),
                }), () => { setConfirmNote(''); setAck(''); setHandling(''); })}>
                {busy ? 'Confirming…' : 'Confirm currency policy'}
              </button>
            </>
          )}
        </section>
      )}

      {data.can_confirm && data.state === 'confirmed' && (
        <section className="rk-crit-card" aria-label="Withdraw confirmation">
          <h3 style={{ marginTop: 0 }}>Withdraw the confirmation</h3>
          <p className="rk-muted">Money-based criteria lock again and the rank engine ignores them. No investor rank, balance or record changes.</p>
          <label className="rk-label" htmlFor="cp-revoke">Reason (at least 10 characters)</label>
          <input id="cp-revoke" className="rk-input" maxLength={1000} value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} />
          <button className="rk-btn rk-btn--danger" disabled={busy || revokeReason.trim().length < 10}
            onClick={() => act(() => rankService.currencyPolicyRevoke({ reason: revokeReason.trim() }), () => setRevokeReason(''))}>Withdraw confirmation</button>
        </section>
      )}

      {history.length > 0 && (
        <section className="rk-crit-card" aria-label="Policy history">
          <h3 style={{ marginTop: 0 }}>History</h3>
          {history.map((h) => (
            <div key={h.id} className="rk-sub-item">
              <div><strong>v{h.version}</strong> · {h.status.replace('_', ' ')}
                <div className="rk-muted">Reviewed by {h.reviewed_by} ({fmtWhen(h.reviewed_at)}){h.confirmed_by ? ` · confirmed by ${h.confirmed_by} (${fmtWhen(h.confirmed_at)})` : ''}{h.revoked_by ? ` · withdrawn by ${h.revoked_by} (${fmtWhen(h.revoked_at)}): ${h.revoke_reason}` : ''}</div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
