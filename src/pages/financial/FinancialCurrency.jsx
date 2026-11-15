import CurrencyReviewTab from '../admin/ranks/CurrencyReviewTab';
import CurrencyPolicyPanel from '../../components/CurrencyPolicyPanel';
import '../admin/AdminPages.css';
import '../admin/ranks/AdminRanks.css';

// Financial-team page for recording the currency / USD value of investment and deposit amounts.
export default function FinancialCurrency() {
  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div>
          <h1>Currency verification</h1>
          <p className="rk-muted">Investor rank thresholds are in USD. Record what currency each amount is in so it can be counted.</p>
        </div>
      </div>
      <CurrencyPolicyPanel />
      <h2 style={{ marginTop: '1.5rem' }}>Verification queue</h2>
      <CurrencyReviewTab />
    </div>
  );
}
