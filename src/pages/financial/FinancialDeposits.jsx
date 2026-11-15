// LOCATION: src/pages/financial/FinancialDeposits.jsx
//
// Financial Team dashboard — reuses AdminDeposits wholesale via its
// `service` prop rather than duplicating ~200 lines of table/modal
// JSX. Same UI, same review/approve/reject/hold workflow investors'
// deposits already go through — just pointed at /financial/* routes
// (gated by FinancialMiddleware) instead of /admin/*.
import AdminDeposits from '../admin/AdminDeposits';
import { financialService } from '../../services/api';

export default function FinancialDeposits() {
  return <AdminDeposits service={financialService} />;
}
