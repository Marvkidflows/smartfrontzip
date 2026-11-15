import RankCriteriaSection from '../../components/RankCriteriaSection';
import RankBenefitsSection from '../../components/RankBenefitsSection';
import RankReportSection from '../../components/RankReportSection';
import RankPlanTermsSection from '../../components/RankPlanTermsSection';

// Dedicated "My Rank" page. All data comes from existing backend endpoints; the investor can only change their own consent / loan application.
export default function InvestorRank() {
  return (
    <div className="inv-dashboard">
      <RankCriteriaSection />
      <RankBenefitsSection />
      <RankPlanTermsSection />
      <RankReportSection />
    </div>
  );
}
