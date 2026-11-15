import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';
import RankBadge from '../../../components/RankBadge';
import { rankService, apiError } from '../../../services/rankService';
import { CHANGE_LABELS, fmtDate } from './rankUtils';
import ReasonModal from './ReasonModal';
import RankEligibilityPanel from '../../../components/RankEligibilityPanel';
import PositionsPanel from './PositionsPanel';
import ValuationReviewNote from '../../../components/ValuationReviewNote';
import '../AdminPages.css';
import './AdminRanks.css';

export default function AdminRankInvestor() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');
  const [override, setOverride] = useState(false);
  const [justification, setJustification] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [retain, setRetain] = useState(false);
  const [retainErr, setRetainErr] = useState('');
  const [openSnap, setOpenSnap] = useState({});

  const load = useCallback(async () => {
    try { setData((await rankService.investor(id)).data); }
    catch (e) { toast.error(apiError(e, 'Could not load investor.')); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="adm-page"><div className="adm-empty">Loading…</div></div>;
  if (!data) return <div className="adm-page"><div className="adm-empty">Investor not found.</div></div>;

  const { investor, standing, open_review: review, history, ranks, hold, prerequisites, currency, override_allowed: overrideAllowed } = data;
  const currentLevel = investor.rank?.level ?? 0;
  const chosen = ranks.find((r) => String(r.id) === String(target));
  const isDowngrade = chosen && chosen.level < currentLevel;
  const selectable = ranks.filter((r) => r.id !== investor.rank?.id);

  const submit = async () => {
    setBusy(true); setErrors({});
    try {
      const body = { rank_id: Number(target), reason, override: override || undefined, override_justification: override ? justification : undefined };
      const res = isDowngrade ? await rankService.downgrade(id, body) : await rankService.assign(id, body);
      toast.success(res.data.message);
      setTarget(''); setReason(''); setOverride(false); setJustification('');
      await load();
    } catch (e) {
      setErrors(e?.response?.data?.errors || {});
      toast.error(apiError(e));
    } finally { setBusy(false); }
  };

  const doRetain = async (why) => {
    setBusy(true); setRetainErr('');
    try { const r = await rankService.retainReview(review.id, { reason: why }); toast.success(r.data.message); setRetain(false); await load(); }
    catch (e) { setRetainErr(apiError(e)); } finally { setBusy(false); }
  };

  const needsOverrideHint = errors.override || errors.override_justification;

  return (
    <div className="adm-page">
      <Link to="/admin/ranks/investors" className="rk-btn rk-btn--sm" style={{ textDecoration: 'none', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
        <FiArrowLeft /> All investors
      </Link>

      <div className="rk-detail-head" style={{ marginTop: 14 }}>
        <div style={{ minWidth: 0 }}>
          <h2>{investor.name}</h2>
          <div className="rk-muted"><span className="rk-mono">{investor.account_id}</span> · {investor.email} · KYC: {investor.kyc_status}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <RankBadge rank={investor.rank} size="lg" />
          <div className="rk-muted">since {fmtDate(investor.rank_changed_at)}{investor.rank_status && investor.rank_status !== 'active' && <> · <span className="rk-chip rk-chip--warn">{investor.rank_status}</span></>}</div>
        </div>
      </div>

      <RankEligibilityPanel investorId={investor.id} scope="admin" onChanged={load} />

      {currency && (currency.investments_unverified.length + currency.investments_stale.length + currency.duplicate_suspects.length
        + currency.deposits_unverified.length + currency.deposits_stale.length > 0) && (
        <div className="rk-banner rk-banner--warn">
          <strong>Some of this investor's records are left out of ranking.</strong>
          {currency.investments_unverified.length + currency.investments_stale.length + currency.deposits_unverified.length + currency.deposits_stale.length > 0
            && <>{' '}Records with an unknown or stale currency valuation are excluded from the qualifying figures until Financial verifies their valuations. They are not treated as zero, and no exchange rate is assumed.</>}
          {currency.duplicate_suspects.length > 0
            && <>{' '}Suspected duplicate records are also excluded while they are under review; Financial must confirm whether each is a separate valid record before it can count.</>}
          <ul>
            {currency.investments_unverified.length > 0 && <li>{currency.investments_unverified.length} investment(s) with no verified USD value</li>}
            {currency.investments_stale.length > 0 && <li>{currency.investments_stale.length} investment(s) whose amount changed since it was verified</li>}
            {currency.duplicate_suspects.length > 0 && <li>{currency.duplicate_suspects.length} investment(s) that look like duplicates</li>}
            {currency.deposits_unverified.length + currency.deposits_stale.length > 0 && <li>{currency.deposits_unverified.length + currency.deposits_stale.length} deposit(s) needing USD verification</li>}
          </ul>
          <div className="rk-muted">Current eligible principal (verified): ${Number(currency.current_eligible_principal ?? 0).toLocaleString()} · historical verified total (reporting only): ${Number(currency.verified_total_usd).toLocaleString()} · completed cycles counted: {currency.completed_cycles}{currency.cycles_awaiting_verification?.length > 0 ? ` (${currency.cycles_awaiting_verification.length} more completed cycle(s) will count once verified)` : ''}.{' '}
            <Link to="/admin/ranks/currency">Review in Currency (USD) →</Link></div>
        </div>
      )}

      <PositionsPanel investorId={id} />

      {currency?.by_currency?.length > 0 && (
        <div className="adm-card" style={{ padding: 16, marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>Verified investments by currency</h3>
          <p className="rk-muted">Rank thresholds are in {currency.ranking_currency || 'USD'}. Each amount is converted with the rate recorded when it was verified.</p>
          <div className="rk-table-wrap">
            <table className="rk-table">
              <thead><tr><th>Currency</th><th>Records</th><th>Original total</th><th>Recorded rate(s)</th><th>Counted as USD</th></tr></thead>
              <tbody>
                {currency.by_currency.map((c) => (
                  <tr key={c.currency}>
                    <td className="rk-mono">{c.currency}</td>
                    <td>{c.records}</td>
                    <td>{Number(c.original_total).toLocaleString(undefined, { minimumFractionDigits: 2 })} {c.currency}</td>
                    <td>{c.currency === 'USD' ? '—' : c.rates.join(', ')}</td>
                    <td>${Number(c.usd_total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {currency?.deposit_funding?.length > 0 && (
        <div className="adm-card" style={{ padding: 16, marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>Approved deposits by funding currency</h3>
          <p className="rk-muted">What was actually paid, as recorded by SSI personnel. Pending, held and rejected deposits are not counted.</p>
          <div className="rk-table-wrap">
            <table className="rk-table">
              <thead><tr><th>Currency paid</th><th>Deposits</th><th>Total paid</th><th>Approved (USD)</th><th>Payment verified</th></tr></thead>
              <tbody>
                {currency.deposit_funding.map((c) => (
                  <tr key={c.currency || 'none'}>
                    <td className="rk-mono">{c.currency || 'not recorded'}</td>
                    <td>{c.records}</td>
                    <td>{c.paid_total !== null ? Number(c.paid_total).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}</td>
                    <td>${Number(c.approved_usd).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td>{c.verified} of {c.records}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {hold && (
        <div className="rk-banner rk-banner--info">
          <strong>Automatic upgrades are held.</strong> You lowered this investor while they still met the criteria for{' '}
          {hold.ranks.map((r) => r.name).join(', ')}. The system will not restore {hold.ranks.length > 1 ? 'those ranks' : 'that rank'} on its own
          unless the investor stops meeting the rule or the rule&apos;s conditions are changed. Assigning a rank manually removes the hold.
        </div>
      )}

      {review && (
        <div className="rk-banner rk-banner--warn" role="alert">
          <strong>Review required.</strong>{' '}
          {review.valuation_note
            ? <>This investor may no longer meet the active {review.rank?.name} criteria (rule v{review.criterion_version}), but this may be valuation-related. Nothing has been changed automatically.</>
            : <>This investor no longer meets the active {review.rank?.name} criteria (rule v{review.criterion_version}). Nothing has been changed automatically.</>}
          <ul>{review.failed_conditions.map((c, i) => <li key={i}>{c.text}</li>)}</ul>
          <ValuationReviewNote note={review.valuation_note} />
          <div className="rk-btn-row" style={{ marginTop: 8 }}>
            <button className="rk-btn rk-btn--sm rk-btn--primary" onClick={() => setRetain(true)}>Retain current rank</button>
            <span className="rk-muted" style={{ alignSelf: 'center' }}>…or choose a lower rank below to downgrade.</span>
          </div>
        </div>
      )}

      <div className="rk-grid-2" style={{ marginTop: 16 }}>
        <div className="adm-card" style={{ padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Change rank</h3>
          <label className="rk-label" htmlFor="rk-target">New rank</label>
          <select id="rk-target" className="rk-select" value={target} onChange={(e) => { setTarget(e.target.value); setErrors({}); }}>
            <option value="">Select a rank…</option>
            {selectable.map((r) => <option key={r.id} value={r.id}>{r.name}{r.level < currentLevel ? ' (downgrade)' : ''}</option>)}
          </select>

          <label className="rk-label" htmlFor="rk-why">Reason (required)</label>
          <textarea id="rk-why" className={`rk-input ${errors.reason ? 'rk-input--invalid' : ''}`} rows={3} maxLength={1000}
            value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this change being made? It is saved in the audit log." />
          {(errors.reason || errors.rank_id) && <div className="rk-error" role="alert">{[...(errors.reason || []), ...(errors.rank_id || [])][0]}</div>}

          {(overrideAllowed || needsOverrideHint) && (
            <div style={{ marginTop: 12 }}>
              {overrideAllowed ? (
                <>
                  <label className="rk-check"><input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
                    Authorized override — apply even if the configured criteria say otherwise</label>
                  {override && (
                    <>
                      <label className="rk-label" htmlFor="rk-just">Override justification (required)</label>
                      <textarea id="rk-just" className="rk-input" rows={2} maxLength={1000} value={justification} onChange={(e) => setJustification(e.target.value)} />
                    </>
                  )}
                </>
              ) : null}
              {errors.override && <div className="rk-banner rk-banner--bad" role="alert">{errors.override[0]}</div>}
              {errors.override_justification && <div className="rk-error" role="alert">{errors.override_justification[0]}</div>}
            </div>
          )}
          {!overrideAllowed && <div className="rk-muted" style={{ marginTop: 10 }}>Exceptions to the configured criteria are currently disabled by Management.</div>}

          <div style={{ marginTop: 14 }}>
            <button className={`rk-btn ${isDowngrade ? 'rk-btn--danger' : 'rk-btn--primary'}`}
              disabled={busy || !target || reason.trim().length < 5} onClick={submit}>
              {busy ? 'Saving…' : isDowngrade ? 'Downgrade investor' : 'Assign rank'}
            </button>
          </div>
        </div>

        <div className="adm-card" style={{ padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Standing against active criteria</h3>
          {prerequisites?.requirements?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div className="rk-muted" style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem' }}>Prerequisites (apply to every rank)</div>
              {prerequisites.requirements.map((r) => (
                <div key={r.key} className="rk-cond-line">
                  <span className={r.met ? 'rk-pass' : 'rk-fail'} aria-label={r.met ? 'met' : 'not met'}>{r.met ? '✓' : '✗'}</span>
                  <span>{r.label} <span className="rk-muted">(currently: {String(r.actual).replace('_', ' ')})</span></span>
                </div>
              ))}
              {!prerequisites.eligible && <div className="rk-error">Not eligible for automatic upgrades until these are met. Existing rank is unchanged.</div>}
            </div>
          )}
          {standing.length === 0 && <div className="rk-muted">No criteria are active yet, so there is nothing to measure against.</div>}
          {standing.map((s) => (
            <div key={s.criterion.id} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <RankBadge rank={s.rank} size="sm" />
                <span className={`rk-chip ${s.satisfied ? 'rk-chip--ok' : 'rk-chip--bad'}`}>{s.satisfied ? 'Qualifies' : 'Does not qualify'}</span>
                {s.is_current && <span className="rk-chip rk-chip--info">Current rank</span>}
              </div>
              {s.conditions.map((c, i) => (
                <div key={i} className="rk-cond-line">
                  <span className={c.passed ? 'rk-pass' : 'rk-fail'} aria-label={c.passed ? 'met' : 'not met'}>{c.passed ? '✓' : '✗'}</span>
                  <span>{c.text} <span className="rk-muted">(actual: {String(c.actual ?? '—')})</span></span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="adm-card" style={{ padding: 16, marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Rank history</h3>
        {history.length === 0 && <div className="rk-muted">No rank changes yet.</div>}
        <ul className="rk-timeline">
          {history.map((h) => (
            <li key={h.id}>
              <div className="rk-timeline__top">
                <span className={`rk-chip ${h.is_automatic ? 'rk-chip--auto' : 'rk-chip--manual'}`}>{h.is_automatic ? 'Automatic' : 'Manual'}</span>
                <strong>{CHANGE_LABELS[h.change_type] || h.change_type}</strong>
                {h.change_type !== 'review_retained' && (<><RankBadge rank={h.previous_rank} size="sm" /> → <RankBadge rank={h.new_rank} size="sm" showUnranked={false} /></>)}
                <span className="rk-muted">{fmtDate(h.created_at)} · {h.actor_name} · <span className="rk-mono">{h.reference}</span></span>
              </div>
              <div style={{ marginTop: 4, fontSize: '0.86rem', overflowWrap: 'anywhere' }}>{h.reason}</div>
              {h.override_justification && <div className="rk-muted">Override justification: {h.override_justification}</div>}
              {h.criteria_snapshot && (
                <>
                  <button className="rk-btn rk-btn--sm" style={{ marginTop: 6 }} aria-expanded={!!openSnap[h.id]} onClick={() => setOpenSnap({ ...openSnap, [h.id]: !openSnap[h.id] })}>
                    {openSnap[h.id] ? 'Hide' : 'Show'} criteria applied
                  </button>
                  {openSnap[h.id] && <pre className="rk-pre">{JSON.stringify(h.criteria_snapshot, null, 2)}</pre>}
                </>
              )}
              {h.notification_status && h.notification_status !== 'sent' && <div className="rk-error">Admin alert: {h.notification_status}</div>}
            </li>
          ))}
        </ul>
        <Link to={`/admin/ranks/audit?investor=${investor.account_id}`} className="rk-muted">Open in full audit log →</Link>
      </div>

      {retain && <ReasonModal title="Retain current rank" intro={`Keep ${investor.name} at ${investor.rank?.name}. The decision is recorded and the same shortfall will not raise another alert.`}
        confirmLabel="Retain rank" busy={busy} error={retainErr} onConfirm={doRetain} onClose={() => { setRetain(false); setRetainErr(''); }} />}
    </div>
  );
}
