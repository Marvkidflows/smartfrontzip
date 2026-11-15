import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import RankBadge from './RankBadge';
import { rankService } from '../services/rankService';
import './RankCriteriaSection.css';
import './RankBenefitsSection.css';

const usd = (n) => `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

function Requirements({ rank }) {
  if (rank.status === 'active') {
    if (rank.min_investment_usd != null || rank.min_completed_cycles != null) {
      return (
        <dl className="rank-crit__reqs">
          {rank.min_investment_usd != null && (
            <div><dt>Minimum investment</dt><dd>{usd(rank.min_investment_usd)}</dd></div>
          )}
          {rank.min_completed_cycles != null && (
            <div><dt>Completed cycles</dt><dd>{rank.min_completed_cycles}</dd></div>
          )}
        </dl>
      );
    }
    return <ul className="rank-crit__list">{rank.requirements.map((r, i) => <li key={i}>{r.text}</li>)}</ul>;
  }
  return (
    <>
      {(rank.official_min_investment_usd != null || rank.official_min_completed_cycles != null) && (
        <dl className="rank-crit__reqs">
          {rank.official_min_investment_usd != null && (
            <div><dt>Minimum investment</dt><dd>{usd(rank.official_min_investment_usd)}</dd></div>
          )}
          {rank.official_min_completed_cycles != null && (
            <div><dt>Completed cycles</dt><dd>{rank.official_min_completed_cycles}</dd></div>
          )}
        </dl>
      )}
      <p className="rank-crit__pending">
        {rank.status === 'pending_currency_approval'
          ? 'Official requirement. Automatic ranking is awaiting Management approval of currency handling.'
          : 'Official requirement. Automatic ranking for this rank is awaiting Management activation.'}
      </p>
    </>
  );
}

function Bar({ label, bar, money }) {
  const fmt = (n) => (money ? usd(n) : n);
  return (
    <div className="rank-crit__bar">
      <div className="rank-crit__bar-head">
        <span>{label}</span>
        <span>{fmt(bar.current)} / {fmt(bar.required)}</span>
      </div>
      <div className="rank-crit__track" role="progressbar" aria-label={label}
           aria-valuemin={0} aria-valuemax={100} aria-valuenow={bar.percent}
           aria-valuetext={`${bar.percent}% — ${fmt(bar.remaining)} remaining`}>
        <div className="rank-crit__fill" style={{ width: `${bar.percent}%` }} />
      </div>
      <div className="rank-crit__bar-foot">{bar.remaining > 0 ? `${fmt(bar.remaining)} remaining` : 'Requirement met'}</div>
    </div>
  );
}

const POSITION_STATUS = {
  active: 'Active', completed_verified: 'Completed — verified', completed_pending_verification: 'Completed — pending verification',
  cancelled: 'Cancelled', under_review: 'Under review',
};

const STATE_MESSAGE = {
  highest: 'You have reached the highest rank, Elite. Congratulations!',
  awaiting_approval: 'The requirements for the next rank are awaiting Management approval.',
  qualifies: 'You meet the requirements for the next rank. Your rank will be awarded after it is reviewed and approved.',
  qualifies_auto: 'You meet the requirements for the next rank. Your rank will be upgraded automatically at the next evaluation.',
  needs_review: 'You meet the requirements for the next rank, but your account needs an Admin review before it can be upgraded.',
  in_progress: null,
};

function Progress({ p }) {
  const msg = STATE_MESSAGE[p.state === 'qualifies' && p.approval_required === false ? 'qualifies_auto' : p.state];
  return (
    <div className="card rank-crit__progress">
      <div className="rank-crit__stats">
        <div><span>Current eligible principal (verified)</span><strong>{usd(p.current_amount_usd)}</strong></div>
        <div><span>Completed cycles</span><strong>{p.completed_cycles}</strong></div>
      </div>
      {p.next_rank && (
        <div className="rank-crit__next">
          <span>Next rank:</span> <RankBadge rank={p.next_rank} size="sm" />
          {p.percent != null && <span className="rank-crit__pct">{p.percent}%</span>}
        </div>
      )}
      {p.amount && <Bar label="Current eligible principal (verified)" bar={p.amount} money />}
      {p.cycles && <Bar label="Completed cycles" bar={p.cycles} />}
      {msg && <p className={`rank-crit__msg rank-crit__msg--${p.state}`} role="status">{msg}</p>}
      {p.excluded.awaiting_verification > 0 && (
        <p className="rank-crit__note">
          {p.excluded.awaiting_verification} investment record(s) are awaiting currency verification and are not counted yet.
        </p>
      )}
      {p.excluded.cycles_awaiting_verification > 0 && (
        <p className="rank-crit__note" role="status">
          {p.excluded.cycles_awaiting_verification} completed cycle(s) will count once their currency has been verified.
        </p>
      )}
      {p.excluded.under_review > 0 && (
        <p className="rank-crit__note" role="status">
          {p.excluded.under_review} position(s) are under review or have unresolved currency records and are not counted yet.
        </p>
      )}
      {p.calculation && (
        <details className="rank-crit__calc">
          <summary>How this was calculated</summary>
          <p className="rb-note">
            Calculated {new Date(p.calculation.calculated_at).toLocaleString()}. Only verified principal still invested in active positions counts toward the amount.
            Wallet cash, completed or redeemed principal and unverified records do not. Completed, verified cycles are counted separately and keep counting.
          </p>
          <div className="rb-scroll" role="region" aria-label="Calculation breakdown" tabIndex={0}>
            <table className="rb-table">
              <caption>Your investment positions</caption>
              <thead><tr><th scope="col">Position</th><th scope="col">Status</th><th scope="col">Principal counted</th><th scope="col">Completed cycle</th><th scope="col">Notes</th></tr></thead>
              <tbody>
                {p.calculation.positions.map((x) => (
                  <tr key={x.investment_id}>
                    <td>{x.reference}</td><td>{POSITION_STATUS[x.status] || x.status}</td><td>{usd(x.principal_usd_counted)}</td>
                    <td>{x.cycle_counted ? `${x.cycle_reference} (counted)` : '—'}</td><td>{x.exclusions.join('; ') || '—'}</td>
                  </tr>
                ))}
                {p.calculation.positions.length === 0 && <tr><td colSpan={5}>No investment positions yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </details>
      )}
      {p.excluded.possible_duplicates > 0 && (
        <p className="rank-crit__note">
          {p.excluded.possible_duplicates} record(s) are awaiting review as possible duplicates and are not counted.
        </p>
      )}
      {p.last_evaluation_at && (
        <p className="rank-crit__note">Last full evaluation: {new Date(p.last_evaluation_at).toLocaleString()}</p>
      )}
    </div>
  );
}

// Compact dashboard summary: current rank, overall progress to the next rank, link to the full page.
function Summary({ p }) {
  const msg = STATE_MESSAGE[p.state];
  return (
    <div className="card rank-crit__progress">
      {p.next_rank && (
        <div className="rank-crit__next">
          <span>Next rank:</span> <RankBadge rank={p.next_rank} size="sm" />
          {p.percent != null && <span className="rank-crit__pct">{p.percent}%</span>}
        </div>
      )}
      {p.percent != null && (
        <div className="rank-crit__track" role="progressbar" aria-label="Progress to next rank"
             aria-valuemin={0} aria-valuemax={100} aria-valuenow={p.percent}>
          <div className="rank-crit__fill" style={{ width: `${p.percent}%` }} />
        </div>
      )}
      {msg && <p className={`rank-crit__msg rank-crit__msg--${p.state}`} role="status">{msg}</p>}
      <Link to="/investor/rank" className="rank-crit__link">View full rank details →</Link>
    </div>
  );
}

export default function RankCriteriaSection({ compact = false }) {
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading');

  useEffect(() => {
    let alive = true;
    rankService.myRankCriteria()
      .then((res) => { if (alive) { setData(res.data); setState('ready'); } })
      .catch(() => { if (alive) setState('error'); });
    return () => { alive = false; };
  }, []);

  const ranks = data?.ranks || [];
  const current = ranks.find((r) => r.is_current);

  return (
    <section className="inv-section rank-crit" aria-labelledby="rank-crit-title">
      <div className="inv-section__header">
        {compact ? <h3 id="rank-crit-title">My Rank</h3> : <h3 id="rank-crit-title">Investor Rank Criteria</h3>}
        {state === 'ready' && <RankBadge rank={current || null} size="md" />}
      </div>

      {state === 'loading' && <div className="skeleton" style={{ height: 120 }} aria-busy="true" />}
      {state === 'error' && <div className="inv-empty"><p>Rank criteria could not be loaded right now. Please try again later.</p></div>}
      {state === 'ready' && ranks.length === 0 && <div className="inv-empty"><p>No ranks are available yet.</p></div>}

      {state === 'ready' && ranks.length > 0 && compact && data.progress && <Summary p={data.progress} />}

      {state === 'ready' && ranks.length > 0 && !compact && (
        <>
          {data.progress && <Progress p={data.progress} />}
          <p className="rank-crit__intro">
            {data.both_required || 'You must meet both the minimum eligible investment and the completed-cycle requirement.'}{' '}
            {data.approval_required === false ? 'Ranks are awarded automatically when all requirements are met.' : 'When you qualify, your rank is awarded after review and approval.'}
          </p>
          <ul className="rank-crit__grid">
            {ranks.map((rank) => (
              <li
                key={rank.key}
                className={`card rank-crit__card ${rank.is_current ? 'is-current' : ''}`}
                aria-current={rank.is_current ? 'true' : undefined}
              >
                <div className="rank-crit__top">
                  <RankBadge rank={rank} size="md" />
                  {rank.is_current && <span className="rank-crit__you">Your rank</span>}
                </div>
                <Requirements rank={rank} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
