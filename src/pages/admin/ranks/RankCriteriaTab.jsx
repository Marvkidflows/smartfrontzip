import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import RankBadge from '../../../components/RankBadge';
import { rankService, apiError, currencyGate } from '../../../services/rankService';
import { CurrencyGateNotice } from '../../../components/CurrencyPolicyPanel';
import { fmtDate } from './rankUtils';
import CriterionEditor from './CriterionEditor';
import ReasonModal from './ReasonModal';

export default function RankCriteriaTab({ onChanged, prerequisites = [], currency, currencyConfirmed = true, currencyPolicy, currencyReview }) {
  const navigate = useNavigate();
  const [ranks, setRanks] = useState([]);
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState(null);   // { rank, criterion? }
  const [confirm, setConfirm] = useState(null); // { kind, criterion }
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [gate, setGate] = useState(null);   // structured currency-policy blockers from the server
  const [open, setOpen] = useState({});

  const load = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([rankService.criteria(), rankService.criteriaSchema()]);
      setRanks(c.data.ranks); setSchema(s.data);
    } catch (e) { toast.error(apiError(e, 'Could not load criteria.')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const afterChange = () => { load(); onChanged?.(); };

  const doConfirm = async (reason) => {
    setBusy(true); setErr(''); setGate(null);
    try {
      const { kind, criterion } = confirm;
      let res;
      if (kind === 'deactivate') res = await rankService.deactivate(criterion.id, { reason });
      if (kind === 'activate')   res = await rankService.activate(criterion.id, { reason });
      if (kind === 'remove')     res = await rankService.removeCriterion(criterion.id, { reason });
      toast.success(res.data.message);
      setConfirm(null); afterChange();
    } catch (e) { setGate(currencyGate(e)); setErr(currencyGate(e) ? '' : apiError(e)); } finally { setBusy(false); }
  };

  if (loading || !schema) return <div className="adm-empty">Loading criteria…</div>;

  return (
    <div>
      {prerequisites.length > 0 && (
        <div className="rk-banner rk-banner--warn">
          <strong>Eligibility prerequisites — apply to every rank, in addition to the criteria below:</strong>
          <ul>{prerequisites.map((p) => <li key={p.key}>{p.label}<span className="rk-muted"> — {p.description}</span></li>)}</ul>
          <div className="rk-muted">An investor who fails a prerequisite is never upgraded automatically. If a ranked investor later fails one, they are flagged under <em>Reviews</em> — never downgraded automatically.
            These are set by the platform configuration, not edited here.</div>
        </div>
      )}
      {currencyConfirmed === false && (
        <div className="rk-banner rk-banner--bad" role="alert">
          <strong>Money-based criteria are locked until the currency policy is confirmed.</strong> Management's thresholds are in USD, and the platform stores amounts without a currency,
          so SSI must confirm how amounts are converted and verified. {{
            pending_confirmation: 'The Financial Team has reviewed it; an Administrator now needs to confirm it.',
            stale: 'The rules changed since the last confirmation, so it must be reviewed and confirmed again.',
            revoked: 'The previous confirmation was withdrawn.',
          }[currencyPolicy?.state] || 'Step 1: the Financial Team reviews the rules. Step 2: an Administrator confirms them.'}{' '}
          Until then, criteria that use a money amount can be saved as <em>drafts</em> but cannot be <em>activated</em>, and the rank engine ignores them. Criteria that use only cycles, verification, account age etc. are not affected.
          <div style={{ marginTop: 8 }}><Link className="rk-btn rk-btn--sm rk-btn--primary" to="/admin/ranks/policy">Open the currency policy</Link></div>
        </div>
      )}
      {currency && (
        <div className="rk-muted" style={{ margin: '0.25rem 0 0.75rem' }}>
          Amount thresholds are in <strong>{currency}</strong>. Only investments with a <strong>verified {currency} value</strong> count — unknown, changed or duplicate-looking records add nothing.
          {currencyReview?.needs_review > 0 && <> <strong>{currencyReview.needs_review.toLocaleString()}</strong> record(s) currently need review.</>}
        </div>
      )}
      <div className="rk-banner rk-banner--info">
        Rules are stored in the database and take effect immediately — no code change or deployment needed.
        Activating or editing a live rule automatically re-evaluates investors and <strong>upgrades</strong> those who qualify.
        <strong>Tip:</strong> when you are bringing several ranks live at once, activate the <em>higher</em> ranks first. Each activation
        re-evaluates existing investors, so activating Bronze → Elite moves an investor up one rung at a time (a record and an alert per step),
        whereas Elite → Bronze moves them straight to the highest rank they qualify for.
        Investors are <strong>never</strong> downgraded automatically; anyone who no longer qualifies appears under <em>Reviews</em> for an Admin decision.
        Ranks are classification labels only and never affect returns, withdrawals or payments.
      </div>

      <div className="rk-crit-list">
        {ranks.map(({ rank, active, criteria }) => {
          const others = criteria.filter((c) => !c.is_active);
          return (
            <section key={rank.id} className="rk-crit-card" aria-label={`${rank.name} criteria`}>
              <div className="rk-crit-card__head">
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <RankBadge rank={rank} size="lg" />
                  <span className={`rk-chip ${active ? 'rk-chip--ok' : 'rk-chip--muted'}`}>{active ? 'Active' : 'No active criteria'}</span>
                </div>
                <div className="rk-btn-row">
                  <button className="rk-btn rk-btn--sm" onClick={() => navigate(`/admin/ranks/audit?kind=criteria&rank_id=${rank.id}`)}>History</button>
                  {active && <button className="rk-btn rk-btn--sm" onClick={() => setEditor({ rank, criterion: active })}>Edit</button>}
                  {active && <button className="rk-btn rk-btn--sm" onClick={() => setConfirm({ kind: 'deactivate', criterion: active })}>Deactivate</button>}
                  <button className="rk-btn rk-btn--sm rk-btn--primary" onClick={() => setEditor({ rank })}>{active ? 'Add replacement' : 'Add criteria'}</button>
                </div>
              </div>

              {active ? (
                <>
                  <div className="rk-rule"><strong>{active.name}</strong> · v{active.version}<br />{active.rule_text}
                    {active.logic !== 'all' && <div className="rk-muted">Logic: {active.logic === 'any' ? 'any one condition' : 'grouped (any complete group)'}</div>}
                  </div>
                  <div className="rk-muted">Last changed by {active.updated_by || active.created_by || '—'} · {fmtDate(active.updated_at)}</div>
                </>
              ) : (
                <div className="rk-muted" style={{ marginTop: 8 }}>No investor can be automatically assigned {rank.name} until criteria are added and activated.</div>
              )}

              {others.length > 0 && (
                <div className="rk-sub">
                  <button className="rk-btn rk-btn--sm" aria-expanded={!!open[rank.id]} onClick={() => setOpen({ ...open, [rank.id]: !open[rank.id] })}>
                    {open[rank.id] ? 'Hide' : 'Show'} inactive ({others.length})
                  </button>
                  {open[rank.id] && others.map((c) => (
                    <div key={c.id} className="rk-sub-item">
                      <div style={{ minWidth: 0, flex: '1 1 260px' }}>
                        <strong>{c.name}</strong> · v{c.version}
                        <div className="rk-muted" style={{ overflowWrap: 'anywhere' }}>{c.rule_text}</div>
                      </div>
                      <div className="rk-btn-row">
                        <button className="rk-btn rk-btn--sm" onClick={() => setEditor({ rank, criterion: c })}>Edit</button>
                        <button className="rk-btn rk-btn--sm rk-btn--primary" onClick={() => setConfirm({ kind: 'activate', criterion: c })}>Activate</button>
                        <button className="rk-btn rk-btn--sm rk-btn--danger" onClick={() => setConfirm({ kind: 'remove', criterion: c })}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {editor && (
        <CriterionEditor rank={editor.rank} criterion={editor.criterion} schema={schema}
          onClose={() => setEditor(null)} onSaved={() => { setEditor(null); afterChange(); }} />
      )}

      {confirm && (
        <ReasonModal
          title={{ activate: 'Activate criteria', deactivate: 'Deactivate criteria', remove: 'Remove criteria' }[confirm.kind]}
          intro={{
            activate: 'This becomes the live rule for the rank (replacing any current one) and investors are re-evaluated for upgrades.',
            deactivate: 'Investors keep their current ranks. The rule simply stops being used for new upgrades.',
            remove: 'The rule is archived. Its full history stays available for audit.',
          }[confirm.kind]}
          extra={<CurrencyGateNotice gate={gate} />}
          required={confirm.kind === 'remove'} danger={confirm.kind === 'remove'}
          confirmLabel={{ activate: 'Activate', deactivate: 'Deactivate', remove: 'Remove' }[confirm.kind]}
          busy={busy} error={err} onConfirm={doConfirm} onClose={() => { setConfirm(null); setErr(''); setGate(null); }} />
      )}
    </div>
  );
}
