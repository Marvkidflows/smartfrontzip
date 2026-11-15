// LOCATION: src/components/market/MarketHeader.jsx
//
// "Live Market" header + status indicator, shared by the public and
// investor pages. Status reflects real backend state (stale cache /
// provider error) rather than a decorative always-on "LIVE" badge.

import './Market.css';

export default function MarketHeader({ subtitle, status }) {
  // status: 'live' | 'stale' | 'down'
  const label = status === 'down' ? 'Data unavailable' : status === 'stale' ? 'Showing recent data' : 'Live';
  const cls = status === 'down' ? 'is-down' : status === 'stale' ? 'is-stale' : '';

  return (
    <div className="mkt-header">
      <div>
        <div className="mkt-header__title">Live Market</div>
        <p className="mkt-header__sub">{subtitle}</p>
      </div>
      <span className={`mkt-status ${cls}`}>
        <span className="mkt-status__dot" />
        {label}
      </span>
    </div>
  );
}
