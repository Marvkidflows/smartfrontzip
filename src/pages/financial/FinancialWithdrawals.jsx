// LOCATION: src/pages/financial/FinancialWithdrawals.jsx
//
// Financial Team dashboard — same reasoning as FinancialDeposits.jsx:
// reuses AdminWithdrawals wholesale via its `service` prop.
import AdminWithdrawals from '../admin/AdminWithdrawals';
import { financialService } from '../../services/api';

export default function FinancialWithdrawals() {
  return <AdminWithdrawals service={financialService} />;
}
