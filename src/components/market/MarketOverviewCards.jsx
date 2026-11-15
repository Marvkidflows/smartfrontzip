// LOCATION: src/components/market/MarketOverviewCards.jsx
//
// Spotlight cards (Bitcoin, Ethereum, Solana, Gold, S&P 500, NASDAQ) at
// the top of the Live Market page. Crypto cards carry a real sparkline
// built from actual hourly history; Gold/S&P 500/NASDAQ show an honest
// "not connected" state when TWELVE_DATA_API_KEY isn't set on the
// backend — see MarketDataService — never a fabricated price.

import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { FiTrendingUp, FiTrendingDown, FiLink } from 'react-icons/fi';
import { fmtUsd, fmtPct } from './marketFormat';
import './Market.css';

function initials(name) {
  return (name || '?').slice(0, 1).toUpperCase();
}

export default function MarketOverviewCards({ assets, loading, selectedId, onSelect }) {
  if (loading) {
    return (
      <div className="mkt-overview-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton mkt-skel-card" />
        ))}
      </div>
    );
  }

  if (!assets?.length) return null;

  return (
    <div className="mkt-overview-grid">
      {assets.map((a) => {
        const up = a.change_24h_pct != null && a.change_24h_pct >= 0;
        const unavailable = a.available === false;
        const sparkData = (a.sparkline || []).filter((v) => v != null).map((v, i) => ({ i, v }));

        return (
          <button
            key={a.id}
            className={`mkt-card ${selectedId === a.id ? 'is-selected' : ''} ${unavailable ? 'is-unavailable' : ''}`}
            onClick={() => !unavailable && onSelect?.(a)}
            disabled={unavailable}
          >
            <div className="mkt-card__top">
              <div className="mkt-card__icon">{initials(a.symbol || a.name)}</div>
              <div className="mkt-card__id">
                <div className="mkt-card__name">{a.name}</div>
                <div className="mkt-card__symbol">{a.symbol}</div>
              </div>
            </div>

            {unavailable ? (
              <div className="mkt-card__unavailable-note">
                <FiLink size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
                Not connected yet
              </div>
            ) : (
              <>
                <div className="mkt-card__mid">
                  <div className="mkt-card__price">{fmtUsd(a.price_usd)}</div>
                  <span className={`mkt-chip ${a.change_24h_pct == null ? 'flat' : up ? 'up' : 'down'}`}>
                    {a.change_24h_pct != null && (up ? <FiTrendingUp size={11} /> : <FiTrendingDown size={11} />)}
                    {fmtPct(a.change_24h_pct)}
                  </span>
                </div>

                {sparkData.length > 1 && (
                  <div className="mkt-card__spark">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sparkData}>
                        <Line
                          type="monotone" dataKey="v" dot={false} strokeWidth={2}
                          stroke={up ? 'var(--success)' : 'var(--danger)'}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
