import { useEffect, useState } from 'react';
import { rankService } from '../services/rankService';
import './RankBenefitsSection.css';

const usd = (n) => `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

// Shown BEFORE the investor commits to a plan: contractual terms, any approved rank incentive (separately), and the risk notice.
export default function PlanTermsNotice({ planId }) {
  const [t, setT] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true; setT(null); setFailed(false);
    if (!planId) return undefined;
    rankService.planTerms(planId).then((r) => alive && setT(r.data)).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [planId]);

  if (!planId) return null;
  if (failed) return <p className="rb-note" role="status">Plan terms could not be loaded. Please read the plan details above before continuing.</p>;
  if (!t) return <div className="skeleton" style={{ height: 80 }} aria-busy="true" />;

  return (
    <div className="card rb-block" aria-labelledby="plan-terms-title">
      <h4 id="plan-terms-title">Terms of {t.plan.name}</h4>
      <dl className="rank-crit__reqs">
        <div><dt>Contractual return</dt><dd>{t.plan.contractual_return_percent}%</dd></div>
        <div><dt>Duration</dt><dd>{t.plan.duration_days} days</dd></div>
        <div><dt>Minimum</dt><dd>{usd(t.plan.min_amount)}</dd></div>
        {t.plan.max_amount != null && <div><dt>Maximum</dt><dd>{usd(t.plan.max_amount)}</dd></div>}
      </dl>
      {t.rank_incentives.length > 0 ? (
        <ul className="rb-list">
          {t.rank_incentives.map((i, k) => (
            <li key={k} className="rb-item">
              <strong>{i.label}</strong> — {i.kind === 'percentage_bonus' ? `${i.value}%` : usd(i.value)} (separate from the contractual return)
              {i.conditions && <p>{i.conditions}</p>}
            </li>
          ))}
        </ul>
      ) : <p className="rb-note">No rank incentive applies to this plan.</p>}
      <p className="rb-note">{t.notice}</p>
      <p className="rb-note">{t.terms_recorded_at_investment}</p>
    </div>
  );
}
