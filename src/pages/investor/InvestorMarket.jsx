// LOCATION: src/pages/investor/InvestorMarket.jsx
//
// Live Market (investor area) — real-time market information, no trade
// execution anywhere on this page. Built from the shared market
// components in src/components/market/ so the public (/market) and
// investor (/investor/market) pages stay visually and behaviourally
// identical, and from the existing .inv-page/.inv-card chrome so it
// reads as part of the rest of the investor dashboard.

import { useEffect, useState } from 'react';
import { marketService } from '../../services/api';
import MarketHeader from '../../components/market/MarketHeader';
import MarketOverviewCards from '../../components/market/MarketOverviewCards';
import MarketChart from '../../components/market/MarketChart';
import MarketAssetList from '../../components/market/MarketAssetList';
import './InvestorPages.css';

export default function InvestorMarket() {
  const [overview, setOverview] = useState([]);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [status, setStatus] = useState('live'); // live | stale | down
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    marketService.getOverview()
      .then((res) => {
        const assets = res.data.assets || [];
        setOverview(assets);
        setStatus(res.data.stale ? 'stale' : 'live');
        setSelected((prev) => prev || assets.find((a) => a.available !== false) || null);
      })
      .catch(() => setStatus('down'))
      .finally(() => setOverviewLoading(false));
  }, []);

  return (
    <div className="inv-page">
      <MarketHeader
        subtitle="Real-time asset prices and performance — information only, not a trading venue."
        status={status}
      />

      <MarketOverviewCards
        assets={overview}
        loading={overviewLoading}
        selectedId={selected?.id}
        onSelect={setSelected}
      />

      <MarketChart asset={selected} />

      <MarketAssetList selectedId={selected?.id} onSelect={setSelected} />
    </div>
  );
}
