// LOCATION: src/pages/investor/InvestorFixtures.jsx
//
// Gaming & Prediction — FINAL SPEC. Points-based, no investment required —
// nothing on this page reads from or writes to wallet/balance. Exactly
// four market types are ever rendered: 1X2, Double Chance, Over/Under,
// Handicap — see MARKET_LABELS below; do not add more without an
// explicit requirement change.
//
// Selecting an option stages it in a "selected prediction" summary
// panel first — nothing is submitted to the server until the investor
// explicitly confirms — so they can always see exactly what they're
// about to submit (fixture, market, selection, configured line) before
// it becomes final.

import { useState, useEffect, useMemo } from 'react';
import { FiTarget, FiInfo, FiAlertTriangle, FiClock, FiCheckCircle, FiX } from 'react-icons/fi';
import { fixtureService } from '../../services/api';
import toast from 'react-hot-toast';
import './InvestorPages.css';

const MARKET_LABELS = {
  one_x_two: '1X2',
  double_chance: 'Double Chance',
  over_under: 'Over/Under',
  handicap: 'Handicap',
};

const STATUS_LABELS = { scheduled: null, live: 'Live', postponed: 'Postponed' };

function selectionOptions(market) {
  switch (market.market_type) {
    case 'one_x_two':
      return [
        { value: 'home', label: 'Home' },
        { value: 'draw', label: 'Draw' },
        { value: 'away', label: 'Away' },
      ];
    case 'double_chance':
      return [
        { value: 'home_or_draw', label: '1X (Home/Draw)' },
        { value: 'draw_or_away', label: 'X2 (Draw/Away)' },
        { value: 'home_or_away', label: '12 (Home/Away)' },
      ];
    case 'over_under':
      return [
        { value: 'over',  label: `Over ${market.line}` },
        { value: 'under', label: `Under ${market.line}` },
      ];
    case 'handicap':
      return [
        { value: 'home', label: `Home (${market.line > 0 ? '+' : ''}${market.line})` },
        { value: 'away', label: 'Away' },
      ];
    default:
      return [];
  }
}

function FixtureStatusBadge({ status }) {
  const label = STATUS_LABELS[status];
  if (!label) return null;
  return <span className={`fx-status-badge fx-status-badge--${status}`}>{label}</span>;
}

function MarketRow({ fixture, market, pendingKey, onStageSelection }) {
  const myPick = market.predictions?.[0];
  const canPredict = fixture.status === 'scheduled';

  return (
    <div className="fx-market-row">
      <div className="fx-market-row__label">{MARKET_LABELS[market.market_type]}</div>
      {myPick ? (
        <div className="fx-market-row__picked">
          <FiCheckCircle size={13} style={{ marginRight: '0.3rem', verticalAlign: '-2px' }} />
          Picked: <strong>{selectionOptions(market).find(o => o.value === myPick.selection)?.label || myPick.selection}</strong>
        </div>
      ) : !canPredict ? (
        <div className="fx-market-row__picked" style={{ opacity: 0.6 }}>
          {fixture.status === 'live' ? 'Kicked off — no longer accepting predictions.' : 'Postponed — predictions will reopen once rescheduled.'}
        </div>
      ) : (
        <div className="fx-market-row__options">
          {selectionOptions(market).map(o => {
            const key = `${market.id}:${o.value}`;
            return (
              <button
                key={o.value}
                className={`fx-pick-btn ${pendingKey === key ? 'fx-pick-btn--active' : ''}`}
                onClick={() => onStageSelection(fixture, market, o)}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FixtureCard({ fixture, pendingKey, onStageSelection }) {
  return (
    <div className="fx-card">
      <div className="fx-card__head">
        <span className="fx-card__league">{fixture.league}</span>
        <span className="fx-card__time"><FiClock size={12} /> {new Date(fixture.kickoff_at).toLocaleString()}</span>
      </div>
      <div className="fx-card__teams">
        {fixture.home_team} <span>vs</span> {fixture.away_team}
        <FixtureStatusBadge status={fixture.status} />
      </div>
      {fixture.markets.length === 0 ? (
        <div className="fx-empty-text">No prediction markets open on this fixture yet.</div>
      ) : (
        fixture.markets.map(m => (
          <MarketRow key={m.id} fixture={fixture} market={m} pendingKey={pendingKey} onStageSelection={onStageSelection} />
        ))
      )}
    </div>
  );
}

// Selected-prediction summary — shown once an option is staged, before
// it's ever sent to the server. Sticky on desktop (side panel), a
// regular card ahead of the fixture list on mobile — see InvestorPages.css.
function SelectionSummary({ pending, submitting, onConfirm, onCancel }) {
  if (!pending) {
    return (
      <div className="pred-summary pred-summary--empty">
        <FiTarget size={22} style={{ opacity: 0.5 }} />
        <p>Pick an outcome on any fixture to see your selection here before submitting.</p>
      </div>
    );
  }

  const { fixture, market, option } = pending;

  return (
    <div className="pred-summary">
      <div className="pred-summary__title">Selected Prediction</div>

      <div className="pred-summary__row">
        <span>Fixture</span>
        <strong>{fixture.home_team} vs {fixture.away_team}</strong>
      </div>
      <div className="pred-summary__row">
        <span>Market</span>
        <strong>{MARKET_LABELS[market.market_type]}</strong>
      </div>
      <div className="pred-summary__row">
        <span>Selection</span>
        <strong>{option.label}</strong>
      </div>
      {market.line != null && (
        <div className="pred-summary__row">
          <span>Configured Value</span>
          <strong>{market.line}</strong>
        </div>
      )}
      <div className="pred-summary__row">
        <span>Status</span>
        <strong className="pred-summary__status">Selected</strong>
      </div>

      <div className="pred-summary__actions">
        <button className="btn btn-ghost btn-sm" onClick={onCancel} disabled={submitting}><FiX /> Clear</button>
        <button className="btn btn-primary btn-sm" onClick={onConfirm} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Confirm Prediction'}
        </button>
      </div>
    </div>
  );
}

export default function InvestorFixtures() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [league, setLeague] = useState('all');
  const [pending, setPending] = useState(null); // { fixture, market, option }
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    fixtureService.getFixtures()
      .then(res => { setData(res.data); setStatus('ready'); })
      .catch(() => setStatus('error'));
  };

  useEffect(() => { load(); }, []);

  const leagues = useMemo(
    () => data ? Array.from(new Set(data.upcoming.map(f => f.league))) : [],
    [data]
  );

  const visibleFixtures = useMemo(() => {
    if (!data) return [];
    return league === 'all' ? data.upcoming : data.upcoming.filter(f => f.league === league);
  }, [data, league]);

  const pendingKey = pending ? `${pending.market.id}:${pending.option.value}` : null;

  const stageSelection = (fixture, market, option) => {
    setPending({ fixture, market, option });
  };

  const confirmSelection = async () => {
    if (!pending) return;
    setSubmitting(true);
    try {
      await fixtureService.predict(pending.market.id, { selection: pending.option.value });
      toast.success('Prediction Submitted');
      setPending(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit your prediction.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="inv-page">
      <div className="inv-page__header">
        <h1>Gaming & Prediction</h1>
        <p>Predict fixture outcomes from top leagues and earn points — no investment required.</p>
      </div>

      <div className="pred-disclaimer">
        <FiInfo size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          This is a free, points-based activity. No money is staked or paid out, and points have no
          cash value. You do not need to invest to take part.
        </span>
      </div>

      {status === 'loading' && <div className="inv-loading">Loading fixtures…</div>}
      {status === 'error' && (
        <div className="inv-empty-state"><FiAlertTriangle size={28} /><p>Couldn't load fixtures right now.</p></div>
      )}

      {status === 'ready' && data && (
        <>
          <div className="pred-points-banner">
            <div>
              <strong>{data.points_total}</strong>
              <span>Total points earned</span>
            </div>
            <FiTarget size={32} style={{ opacity: 0.6 }} />
          </div>

          <div className="pred-layout">
            <div className="pred-layout__main">
              <div className="inv-card">
                <div className="inv-card__header"><div className="inv-card__title">Upcoming Fixtures</div></div>

                {leagues.length > 1 && (
                  <div className="pred-league-filters">
                    <button className={`pred-league-chip ${league === 'all' ? 'active' : ''}`} onClick={() => setLeague('all')}>All Competitions</button>
                    {leagues.map(l => (
                      <button key={l} className={`pred-league-chip ${league === l ? 'active' : ''}`} onClick={() => setLeague(l)}>{l}</button>
                    ))}
                  </div>
                )}

                {/* Mobile: selection summary sits above the list so it's
                    visible without scrolling past fixtures. Desktop hides
                    it here — see the sticky sidebar copy below. */}
                <div className="pred-summary--mobile-only">
                  <SelectionSummary pending={pending} submitting={submitting} onConfirm={confirmSelection} onCancel={() => setPending(null)} />
                </div>

                {visibleFixtures.length === 0 ? (
                  <div className="inv-empty-state"><p>No upcoming fixtures right now — check back soon.</p></div>
                ) : (
                  <div className="fx-grid">
                    {visibleFixtures.map(f => (
                      <FixtureCard key={f.id} fixture={f} pendingKey={pendingKey} onStageSelection={stageSelection} />
                    ))}
                  </div>
                )}
              </div>

              <div className="inv-card">
                <div className="inv-card__header"><div className="inv-card__title">Your History</div></div>
                {data.history.length === 0 ? (
                  <div className="inv-empty-state"><p>No resolved predictions yet.</p></div>
                ) : (
                  data.history.map(f => (
                    <div key={f.id} className="fx-history-row">
                      <div>
                        <strong>{f.home_team} {f.home_score}–{f.away_score} {f.away_team}</strong>
                        <div style={{ fontSize:'0.75rem', color:'var(--gray-400)' }}>{f.league}</div>
                      </div>
                      <div className="fx-history-row__markets">
                        {f.markets.map(m => {
                          const p = m.predictions?.[0];
                          if (!p) return null;
                          return (
                            <span key={m.id} className={`pred-outcome-pill ${p.is_correct ? 'correct' : 'incorrect'}`}>
                              {MARKET_LABELS[m.market_type]}: {p.is_correct ? `+${p.points_awarded}` : '0'}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Desktop-only sticky summary sidebar — same component, mobile
                copy above is hidden via CSS at wider breakpoints. */}
            <div className="pred-layout__sidebar pred-summary--desktop-only">
              <SelectionSummary pending={pending} submitting={submitting} onConfirm={confirmSelection} onCancel={() => setPending(null)} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
