import { useEffect, useState } from 'react';
import { rankService } from '../services/rankService';

const usd = (n) => `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

// Shown inside the "Invest now" form, BEFORE the investor presses Confirm.
// Source of truth is the server (GET /investor-investment/rank/plan-terms/{plan}): the contractual return comes from the plan, and a rank
// incentive is listed only when SSI has approved and activated it (none by default). Nothing here changes what is invested or what is paid,
// and a failed load shows nothing and never blocks investing.
export default function PlanCommitTerms({ planId }) {
  const [d, setD] = useState(null);

  useEffect(() => {
    let alive = true;
    setD(null);
    rankService.planTerms(planId)
      .then((r) => { if (alive) setD(r.data); })
      .catch(() => { if (alive) setD(null); });
    return () => { alive = false; };
  }, [planId]);

  if (!d || !d.plan) return null;
  const incentives = d.rank_incentives || [];

  return (
    <div className="plan-commit-terms" role="note" aria-label="Terms that apply to this investment"
      style={{ margin: '0 0 0.75rem', padding: '0.6rem 0.75rem', border: '1px solid var(--gray-200)', borderRadius: 8, fontSize: '0.75rem', lineHeight: 1.45 }}>
      <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Terms that apply to this investment</strong>
      <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
        <li>Contractual return: {d.plan.contractual_return_percent}% over {d.plan.duration_days} days</li>
        <li>
          Rank incentive:{' '}
          {incentives.length
            ? incentives.map((i, k) => (
              <span key={k} style={{ display: 'block' }}>
                {i.label}: {i.kind === 'percentage_bonus' ? `${i.value}%` : usd(i.value)} (separate from the return){i.conditions ? ` — ${i.conditions}` : ''}
              </span>
            ))
            : 'none applies'}
        </li>
      </ul>
      {d.notice && <p style={{ margin: '0.4rem 0 0' }}>{d.notice}</p>}
      {d.terms_recorded_at_investment && <p style={{ margin: '0.25rem 0 0' }}>{d.terms_recorded_at_investment}</p>}
    </div>
  );
}
