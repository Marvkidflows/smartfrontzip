import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import RankBadge from '../../components/RankBadge';
import { rankService, apiError } from '../../services/rankService';
import RankInvestorsTab from './ranks/RankInvestorsTab';
import RankCriteriaTab from './ranks/RankCriteriaTab';
import RankReviewsTab from './ranks/RankReviewsTab';
import RankAuditTab from './ranks/RankAuditTab';
import RankActivityTab from './ranks/RankActivityTab';
import CurrencyReviewTab from './ranks/CurrencyReviewTab';
import AdditionalCriteriaTab from './ranks/AdditionalCriteriaTab';
import RankBenefitsTab from './ranks/RankBenefitsTab';
import FinancialControlsTab from './ranks/FinancialControlsTab';
import RankApprovalsPanel from '../../components/RankApprovalsPanel';
import CurrencyPolicyPanel from '../../components/CurrencyPolicyPanel';
import './AdminPages.css';
import './ranks/AdminRanks.css';

const TABS = ['investors', 'approvals', 'criteria', 'additional', 'benefits', 'controls', 'reviews', 'policy', 'currency', 'audit', 'activity'];

export default function AdminRanks() {
  const { tab = 'investors' } = useParams();
  const [overview, setOverview] = useState(null);

  const loadOverview = useCallback(async () => {
    try { setOverview((await rankService.overview()).data); }
    catch (e) { toast.error(apiError(e, 'Could not load rank overview.')); }
  }, []);
  useEffect(() => { loadOverview(); }, [loadOverview]);

  if (!TABS.includes(tab)) return <Navigate to="/admin/ranks/investors" replace />;

  const tabLabel = {
    investors: 'Investors', approvals: 'Approvals', criteria: 'Rank Criteria', additional: 'Additional Criteria', benefits: 'Benefits & Loans', controls: 'Financial Controls', reviews: 'Reviews', policy: 'Currency policy', currency: 'Currency (USD)', audit: 'Audit Log', activity: 'Activity',
  };

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div>
          <h1>Investor Ranks</h1>
          <p className="rk-muted">Classify investors into Bronze → Elite. Ranks are labels only — they never change returns, withdrawals or payments.</p>
        </div>
      </div>

      {overview && !overview.has_active_criteria && (
        <div className="rk-banner rk-banner--info">
          No rank criteria are active yet, so no investor is being ranked automatically. Management's proposed thresholds (Bronze → Elite) are available as inactive drafts and are activated here, under{' '}
          <Link to="/admin/ranks/criteria">Rank Criteria</Link>.
        </div>
      )}

      {overview && (
        <div className="rk-rank-grid" aria-label="Investors per rank">
          {overview.ranks.map((r) => (
            <div key={r.id} className="rk-rank-tile">
              <RankBadge rank={r} size="md" />
              <div className="rk-rank-tile__count">{r.investor_count.toLocaleString()}</div>
              <div className="rk-muted">{r.active_criteria ? 'Criteria active' : 'No active criteria'}</div>
            </div>
          ))}
          <div className="rk-rank-tile"><RankBadge rank={null} size="md" /><div className="rk-rank-tile__count">{overview.unranked_count.toLocaleString()}</div><div className="rk-muted">No rank yet</div></div>
        </div>
      )}

      <nav className="rk-tabs" aria-label="Rank management sections">
        {TABS.map((t) => (
          <NavLink key={t} to={`/admin/ranks/${t}`} className={({ isActive }) => `rk-tab ${isActive ? 'rk-tab--active' : ''}`}>
            {tabLabel[t]}
            {t === 'approvals' && overview?.pending_approvals > 0 && <span className="rk-count">{overview.pending_approvals}</span>}
            {t === 'reviews' && overview?.open_reviews > 0 && <span className="rk-count">{overview.open_reviews}</span>}
            {t === 'activity' && overview?.failed_alerts > 0 && <span className="rk-count">{overview.failed_alerts}</span>}
            {t === 'policy' && overview && overview.currency_confirmed === false && <span className="rk-count" title="Currency policy not confirmed">!</span>}
            {t === 'currency' && overview?.currency_review?.needs_review > 0 && <span className="rk-count">{overview.currency_review.needs_review}</span>}
          </NavLink>
        ))}
      </nav>

      {tab === 'investors' && <RankInvestorsTab />}
      {tab === 'approvals' && <RankApprovalsPanel scope="admin" onChanged={loadOverview} />}
      {tab === 'additional' && <AdditionalCriteriaTab onChanged={loadOverview} />}
      {tab === 'criteria'  && <RankCriteriaTab onChanged={loadOverview} prerequisites={overview?.prerequisites} currency={overview?.ranking_currency} currencyConfirmed={overview?.currency_confirmed} currencyPolicy={overview?.currency_policy} currencyReview={overview?.currency_review} />}
      {tab === 'benefits'  && <RankBenefitsTab />}
      {tab === 'controls'  && <FinancialControlsTab />}
      {tab === 'reviews'   && <RankReviewsTab onChanged={loadOverview} />}
      {tab === 'policy'    && <CurrencyPolicyPanel onChanged={loadOverview} />}
      {tab === 'currency'  && <CurrencyReviewTab onChanged={loadOverview} />}
      {tab === 'audit'     && <RankAuditTab />}
      {tab === 'activity'  && <RankActivityTab onChanged={loadOverview} />}
    </div>
  );
}
