// LOCATION: src/pages/investor/InvestorPredictions.jsx
//
// Phase 4 — Gaming & Prediction Functionality, investor side.
// Points only, never real money — nothing on this page reads from or
// writes to wallet/balance. See backend AdminPredictionController's
// header comment for full scope notes and what real-money wagering
// would require.

import { useState, useEffect } from 'react';
import { FiTrendingUp, FiTrendingDown, FiTarget, FiAlertTriangle, FiInfo } from 'react-icons/fi';
import { predictionService } from '../../services/api';
import toast from 'react-hot-toast';
import './InvestorPages.css';

function RoundCard({ round, onEntered }) {
  const [submitting, setSubmitting] = useState(false);
  const myEntry = round.entries?.[0];

  const enter = async (choice) => {
    setSubmitting(true);
    try {
      await predictionService.enter(round.id, { choice });
      toast.success('Prediction submitted!');
      onEntered();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit your prediction.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pred-round-card">
      <div className="pred-round-card__asset">{round.asset_symbol}</div>
      <div className="pred-round-card__question">{round.question}</div>
      <div className="pred-round-card__meta">
        <span>Stake: {round.points_stake} pts</span>
        <span>Win: {round.points_payout} pts</span>
      </div>
      <div className="pred-round-card__meta">
        <span>Closes {new Date(round.closes_at).toLocaleString()}</span>
      </div>

      {myEntry ? (
        <div className="pred-entered-badge">
          You predicted <strong style={{ textTransform: 'uppercase' }}>{myEntry.choice}</strong> — result pending
        </div>
      ) : (
        <div className="pred-choice-row">
          <button className="pred-choice-btn up" disabled={submitting} onClick={() => enter('up')}>
            <FiTrendingUp /> Up
          </button>
          <button className="pred-choice-btn down" disabled={submitting} onClick={() => enter('down')}>
            <FiTrendingDown /> Down
          </button>
        </div>
      )}
    </div>
  );
}

function HistoryRow({ round }) {
  const entry = round.entries?.[0];
  if (!entry) return null;
  const settled = entry.is_correct !== null && entry.is_correct !== undefined;
  const pillClass = !settled ? 'pending' : (entry.is_correct ? 'correct' : 'incorrect');
  const pillText = !settled ? 'Pending' : (entry.is_correct ? `+${entry.points_awarded} pts` : 'No win');

  return (
    <div className="pred-history-row">
      <div>
        <strong>{round.asset_symbol}</strong> — {round.question}
        <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
          You picked {entry.choice.toUpperCase()}{round.outcome ? ` · actual: ${round.outcome.toUpperCase()}` : ''}
        </div>
      </div>
      <span className={`pred-outcome-pill ${pillClass}`}>{pillText}</span>
    </div>
  );
}

export default function InvestorPredictions() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');

  const load = () => {
    predictionService.getRounds()
      .then(res => { setData(res.data); setStatus('ready'); })
      .catch(() => setStatus('error'));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="inv-page">
      <div className="inv-page__header">
        <h1>Predictions</h1>
        <p>A points-based activity — predict short-term price direction and earn points.</p>
      </div>

      <div className="pred-disclaimer">
        <FiInfo size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          This is a points-based activity for engagement only. No real money is staked or paid out here,
          and points have no cash value. This is separate from your investments and wallet.
        </span>
      </div>

      {status === 'loading' && <div className="inv-loading">Loading…</div>}

      {status === 'error' && (
        <div className="inv-empty-state"><FiAlertTriangle size={28} /><p>Couldn't load predictions right now.</p></div>
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

          <div className="inv-card">
            <div className="inv-card__header"><div className="inv-card__title">Open Rounds</div></div>
            {data.open.length === 0 ? (
              <div className="inv-empty-state"><p>No prediction rounds are open right now — check back soon.</p></div>
            ) : (
              <div className="pred-round-grid">
                {data.open.map(r => <RoundCard key={r.id} round={r} onEntered={load} />)}
              </div>
            )}
          </div>

          <div className="inv-card">
            <div className="inv-card__header"><div className="inv-card__title">Your History</div></div>
            {data.history.length === 0 ? (
              <div className="inv-empty-state"><p>No past predictions yet.</p></div>
            ) : (
              data.history.map(r => <HistoryRow key={r.id} round={r} />)
            )}
          </div>
        </>
      )}
    </div>
  );
}
