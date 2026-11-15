import { useEffect, useState } from 'react';
import { rankService } from '../services/rankService';
import './RankBenefitsSection.css';

const usd = (n) => `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

// Applicable investment-plan terms and any rank incentive, on the rank page (framework §8). Contractual terms are read from the plan;
// rank incentives appear only when SSI has approved and activated them (none by default).
export default function RankPlanTermsSection() {
  const [d, setD] = useState(null);
  const [state, setState] = useState('loading');
  useEffect(() => {
    let alive = true;
    rankService.allPlanTerms().then((r) => { if (alive) { setD(r.data); setState('ready'); } }).catch(() => alive && setState('error'));
    return () => { alive = false; };
  }, []);

  if (state === 'loading') return <div className="skeleton" style={{ height: 80 }} aria-busy="true" />;
  if (state === 'error' || !d.plans.length) return null;

  return (
    <section className="inv-section rb" aria-labelledby="rb-plans-title">
      <div className="inv-section__header"><h3 id="rb-plans-title">Investment Plan Terms &amp; Incentives</h3></div>
      <p className="rank-crit__intro">{d.notice}</p>
      <div className="rb-scroll" role="region" aria-label="Investment plan terms" tabIndex={0}>
        <table className="rb-table">
          <caption>Plans open for investment</caption>
          <thead><tr><th scope="col">Plan</th><th scope="col">Contractual return</th><th scope="col">Duration</th><th scope="col">Minimum</th><th scope="col">Maximum</th><th scope="col">Rank incentive</th></tr></thead>
          <tbody>
            {d.plans.map((p) => (
              <tr key={p.plan.id}>
                <td>{p.plan.name}</td><td>{p.plan.contractual_return_percent}%</td><td>{p.plan.duration_days} days</td>
                <td>{usd(p.plan.min_amount)}</td><td>{p.plan.max_amount != null ? usd(p.plan.max_amount) : '—'}</td>
                <td>{p.rank_incentives.length
                  ? p.rank_incentives.map((i, k) => <div key={k}>{i.label}: {i.kind === 'percentage_bonus' ? `${i.value}%` : usd(i.value)} (separate from the return){i.conditions ? ` — ${i.conditions}` : ''}</div>)
                  : 'None applies'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="rb-note">{d.terms_recorded_at_investment}</p>
    </section>
  );
}
