// LOCATION: src/components/market/MarketChart.jsx
//
// The large price chart for whichever asset is currently selected.
// Range buttons map to what the configured provider can really deliver
// — see MarketDataService::historicalTicks() — rather than offering
// sub-hourly ranges (1H/4H) that would either be empty or require a
// paid plan. Never fabricates a curve: an asset with no real history
// yet (or a provider that isn't configured) shows an honest empty state.

import { useEffect, useState } from 'react';
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip, XAxis } from 'recharts';
import { FiTrendingUp, FiTrendingDown, FiBarChart2, FiAlertTriangle } from 'react-icons/fi';
import { marketService } from '../../services/api';
import { fmtUsd, fmtPct, RANGE_OPTIONS } from './marketFormat';
import './Market.css';

function fmtAxisTime(t, range) {
  if (!t) return '';
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return '';
  if (range === '24h') return d.toLocaleTimeString(undefined, { hour: 'numeric' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function MarketChart({ asset }) {
  const [range, setRange] = useState('24h');
  const [detail, setDetail] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error

  useEffect(() => {
    if (!asset?.id) { setDetail(null); setStatus('idle'); return; }
    setStatus('loading');
    marketService.getAsset(asset.id, { interval: range })
      .then((res) => { setDetail(res.data.asset); setStatus('ready'); })
      .catch(() => setStatus('error'));
  }, [asset?.id, range]);

  if (!asset) {
    return (
      <div className="mkt-chart-card">
        <div className="mkt-state">
          <FiBarChart2 size={26} />
          <p>Pick an asset from the Market Overview cards or the list below to see its price chart.</p>
        </div>
      </div>
    );
  }

  const price = detail?.price_usd ?? asset.price_usd;
  const change = detail?.change_24h_pct ?? asset.change_24h_pct;
  const up = change != null && change >= 0;
  const history = detail?.price_history || [];
  const chartData = history.filter((p) => p.price != null);

  return (
    <div className="mkt-chart-card">
      <div className="mkt-chart-head">
        <div className="mkt-chart-head__left">
          <div>
            <div>
              <span className="mkt-chart-asset-name">{asset.name}</span>
              <span className="mkt-chart-asset-symbol">{asset.symbol}</span>
            </div>
            <div className="mkt-chart-price">{fmtUsd(price)}</div>
          </div>
          {change != null && (
            <span className={`mkt-chip ${up ? 'up' : 'down'}`} style={{ fontSize: '0.82rem' }}>
              {up ? <FiTrendingUp size={13} /> : <FiTrendingDown size={13} />}
              {fmtPct(change)} <span style={{ fontWeight: 500, opacity: 0.75 }}>24h</span>
            </span>
          )}
        </div>

        <div className="mkt-range-tabs">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r.value}
              className={`mkt-range-tab ${range === r.value ? 'active' : ''}`}
              onClick={() => setRange(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {status === 'loading' && (
        <div className="mkt-chart-empty"><div className="spinner" style={{ borderTopColor: 'var(--royal)', borderColor: 'rgba(26,58,143,0.15)' }} /></div>
      )}

      {status === 'error' && (
        <div className="mkt-chart-empty">
          <FiAlertTriangle size={24} />
          <p>Chart data is temporarily unavailable. Please try again shortly.</p>
        </div>
      )}

      {status === 'ready' && chartData.length < 2 && (
        <div className="mkt-chart-empty">
          <FiBarChart2 size={24} />
          <p>
            {asset.available === false
              ? 'This asset isn\u2019t connected to a live data provider yet.'
              : 'Not enough price history for this range yet.'}
          </p>
        </div>
      )}

      {status === 'ready' && chartData.length >= 2 && (
        <div className="mkt-chart-body">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="mktFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--royal)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--royal)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time" tickFormatter={(t) => fmtAxisTime(t, range)}
                tick={{ fontSize: 11, fill: 'var(--gray-400)' }} axisLine={false} tickLine={false} minTickGap={40}
              />
              <YAxis domain={['auto', 'auto']} hide />
              <Tooltip
                formatter={(v) => [fmtUsd(v), 'Price']}
                labelFormatter={(t) => new Date(t).toLocaleString()}
                contentStyle={{ borderRadius: 10, border: '1px solid var(--gray-200)', fontSize: '0.8rem' }}
              />
              <Area type="monotone" dataKey="price" stroke="var(--royal)" strokeWidth={2} fill="url(#mktFill)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
