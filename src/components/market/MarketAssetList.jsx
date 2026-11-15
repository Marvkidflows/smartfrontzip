// LOCATION: src/components/market/MarketAssetList.jsx
//
// Category-filterable asset table (desktop) / stacked cards (mobile).
// Backed by GET /market/assets — see MarketController::index() and
// MarketDataService::listAssets()/listNonCrypto().

import { useEffect, useState } from 'react';
import { FiSearch, FiTrendingUp, FiTrendingDown, FiAlertTriangle, FiLink } from 'react-icons/fi';
import { marketService } from '../../services/api';
import { fmtUsd, fmtPct, fmtCompactUsd, CATEGORY_LABELS } from './marketFormat';
import './Market.css';

const CATEGORIES = [
  { value: null, label: 'All' },
  { value: 'crypto', label: CATEGORY_LABELS.crypto },
  { value: 'commodity', label: CATEGORY_LABELS.commodity },
  { value: 'index', label: CATEGORY_LABELS.index },
];

function initials(sym) { return (sym || '?').slice(0, 1).toUpperCase(); }

export default function MarketAssetList({ selectedId, onSelect }) {
  const [category, setCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [assets, setAssets] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    setStatus('loading');
    const t = setTimeout(() => {
      marketService.getAssets({ search: search || undefined, category: category || undefined, limit: 40 })
        .then((res) => { setAssets(res.data.assets || []); setStatus('ready'); })
        .catch(() => setStatus('error'));
    }, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [search, category]);

  return (
    <div className="mkt-list-card">
      <div className="mkt-list-head">
        <div className="mkt-list-title">Assets</div>
        <div className="mkt-list-controls">
          <div className="mkt-cat-tabs">
            {CATEGORIES.map((c) => (
              <button
                key={c.label}
                className={`mkt-cat-tab ${category === c.value ? 'active' : ''}`}
                onClick={() => setCategory(c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="mkt-search">
            <FiSearch size={14} />
            <input placeholder="Search assets…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {status === 'loading' && <div className="mkt-state">Loading market data…</div>}

      {status === 'error' && (
        <div className="mkt-state">
          <FiAlertTriangle size={24} />
          <p>Market data is temporarily unavailable. Please check back shortly.</p>
        </div>
      )}

      {status === 'ready' && assets.length === 0 && (
        <div className="mkt-state"><p>No assets match your search.</p></div>
      )}

      {status === 'ready' && assets.length > 0 && (
        <>
          <div className="mkt-table-wrap">
            <table className="mkt-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th className="num">Price</th>
                  <th className="num">24h Change</th>
                  <th className="num">Market Cap</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <AssetRow key={a.id} a={a} selected={selectedId === a.id} onSelect={onSelect} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="mkt-mobile-list">
            {assets.map((a) => (
              <MobileRow key={a.id} a={a} selected={selectedId === a.id} onSelect={onSelect} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AssetRow({ a, selected, onSelect }) {
  const unavailable = a.available === false;
  const up = a.change_24h_pct != null && a.change_24h_pct >= 0;
  return (
    <tr className={selected ? 'is-selected' : ''} onClick={() => !unavailable && onSelect?.(a)}>
      <td>
        <div className="mkt-table-name">
          <div className="mkt-table-name__icon">{initials(a.symbol)}</div>
          <div className="mkt-table-name__text">
            <strong>{a.name}</strong>
            <small>{a.symbol}</small>
          </div>
        </div>
      </td>
      <td className="num mkt-table-price">{unavailable ? '—' : fmtUsd(a.price_usd)}</td>
      <td className="num">
        {unavailable ? '—' : (
          <span className={`mkt-chip ${up ? 'up' : 'down'}`}>{fmtPct(a.change_24h_pct)}</span>
        )}
      </td>
      <td className="num">{unavailable ? '—' : fmtCompactUsd(a.market_cap_usd)}</td>
      <td>
        {unavailable ? (
          <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <FiLink size={12} /> Not connected
          </span>
        ) : (
          up ? <FiTrendingUp color="var(--success)" /> : <FiTrendingDown color="var(--danger)" />
        )}
      </td>
    </tr>
  );
}

function MobileRow({ a, selected, onSelect }) {
  const unavailable = a.available === false;
  const up = a.change_24h_pct != null && a.change_24h_pct >= 0;
  return (
    <button className={`mkt-mobile-row ${selected ? 'is-selected' : ''}`} onClick={() => !unavailable && onSelect?.(a)}>
      <div className="mkt-table-name__icon">{initials(a.symbol)}</div>
      <div className="mkt-mobile-row__mid">
        <strong style={{ display: 'block', fontSize: '0.88rem', color: 'var(--navy)', fontWeight: 700 }}>{a.name}</strong>
        <small style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>{a.symbol}</small>
      </div>
      <div className="mkt-mobile-row__right">
        {unavailable ? (
          <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>Not connected</span>
        ) : (
          <>
            <span className="mkt-table-price">{fmtUsd(a.price_usd)}</span>
            <span className={`mkt-chip ${up ? 'up' : 'down'}`}>{fmtPct(a.change_24h_pct)}</span>
          </>
        )}
      </div>
    </button>
  );
}
