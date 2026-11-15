// LOCATION: src/pages/public/MarketPage.jsx
//
// Live Market — public Market Information page. Read-only market data,
// reachable from the main nav without logging in. Clearly labeled as
// information, not a trading venue — matches MarketController's header
// comment on the backend. Built from the same shared components as the
// investor Live Market page (src/components/market/) so both stay in
// sync automatically.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiInfo, FiArrowRight } from 'react-icons/fi';
import { marketService } from '../../services/api';
import MarketOverviewCards from '../../components/market/MarketOverviewCards';
import MarketChart from '../../components/market/MarketChart';
import MarketAssetList from '../../components/market/MarketAssetList';
import './PublicPages.css';

export default function MarketPage() {
  const [overview, setOverview] = useState([]);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    marketService.getOverview()
      .then((res) => {
        const assets = res.data.assets || [];
        setOverview(assets);
        setSelected((prev) => prev || assets.find((a) => a.available !== false) || null);
      })
      .catch(() => {})
      .finally(() => setOverviewLoading(false));
  }, []);

  return (
    <div className="pub-page">
      <section className="pub-hero pub-hero--sm">
        <div className="pub-hero__overlay" />
        <div className="container pub-hero__inner">
          <div className="section-eyebrow" style={{ justifyContent: 'center' }}>Market Information</div>
          <h1 className="pub-page-title">Live Market</h1>
          <p className="pub-page-sub">
            Real-time market insights and asset performance.
          </p>
        </div>
      </section>

      <section style={{ padding: '3.5rem 0', background: 'var(--gray-50)' }}>
        <div className="container">
          <div style={{
            display: 'flex', gap: '0.6rem', alignItems: 'flex-start',
            background: '#fff7ed', border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', marginBottom: '2rem', maxWidth: 760,
          }}>
            <FiInfo size={18} style={{ flexShrink: 0, marginTop: 2, color: 'var(--warning)' }} />
            <p style={{ fontSize: '0.88rem', color: 'var(--gray-600)', margin: 0 }}>
              This page shows market information only — asset prices and how they've moved. It is not a
              trading venue: you cannot buy, sell, or execute an order here. To invest with Smart System
              Investment, see our <Link to="/plans" style={{ color: 'var(--royal)', fontWeight: 700 }}>investment plans</Link>.
            </p>
          </div>

          <MarketOverviewCards
            assets={overview}
            loading={overviewLoading}
            selectedId={selected?.id}
            onSelect={setSelected}
          />

          <MarketChart asset={selected} />

          <MarketAssetList selectedId={selected?.id} onSelect={setSelected} />

          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <Link to="/register" className="btn btn-gold btn-lg">
              Start Investing <FiArrowRight />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
