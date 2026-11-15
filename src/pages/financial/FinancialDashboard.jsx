// LOCATION: src/pages/financial/FinancialDashboard.jsx
//
// Financial Team dashboard — overview page. Reuses the exact same
// /financial/dashboard endpoint as AdminDashboard's /admin/dashboard
// (same underlying AdminDashboardController::dashboard() method, see
// routes/api.php) — the response is purely financial/statistical data
// (deposit/withdrawal/revenue totals, investor counts), nothing about
// admin accounts or platform settings, so it's safe to surface here
// unmodified. This page shows a focused subset of that same payload
// rather than every card AdminDashboard.jsx shows, since not
// everything there (e.g. platform growth trend framing) is squarely
// "financial operations."
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiDollarSign, FiArrowUpCircle, FiClock, FiTrendingUp, FiCheckCircle, FiUsers } from 'react-icons/fi';
import { financialService } from '../../services/api';
import toast from 'react-hot-toast';
import '../admin/AdminPages.css';

function StatCard({ icon: Icon, label, value, color, gradient }) {
  return (
    <div className="adm-stat-card" style={{ '--gradient': gradient || `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)` }}>
      <div className="adm-stat-card__icon"><Icon size={22} /></div>
      <div className="adm-stat-card__body">
        <div className="adm-stat-card__label">{label}</div>
        <div className="adm-stat-card__value">{value}</div>
      </div>
    </div>
  );
}

export default function FinancialDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    financialService.getDashboard()
      .then(res => setData(res.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const stats = data?.stats || {};

  const STAT_CARDS = [
    { icon: FiDollarSign,    label: 'Total Deposits',      value: `$${parseFloat(stats.total_deposits || 0).toLocaleString()}`,    color: '#3B82F6', gradient: 'linear-gradient(135deg,#1D4ED8,#3B82F6)' },
    { icon: FiArrowUpCircle, label: 'Total Withdrawals',   value: `$${parseFloat(stats.total_withdrawals || 0).toLocaleString()}`, color: '#8B5CF6', gradient: 'linear-gradient(135deg,#6D28D9,#8B5CF6)' },
    { icon: FiClock,         label: 'Pending Withdrawals', value: stats.pending_withdrawals || 0,                                  color: '#F59E0B', gradient: 'linear-gradient(135deg,#D97706,#F59E0B)' },
    { icon: FiTrendingUp,    label: 'Total Investments',   value: `$${parseFloat(stats.total_investments || 0).toLocaleString()}`, color: '#C9A84C', gradient: 'linear-gradient(135deg,#B45309,#C9A84C)' },
    { icon: FiCheckCircle,   label: 'Company Revenue',     value: `$${parseFloat(stats.company_revenue || 0).toLocaleString()}`,   color: '#10B981', gradient: 'linear-gradient(135deg,#065F46,#10B981)' },
    { icon: FiUsers,         label: 'Active Investors',    value: stats.active_investors || 0,                                     color: '#1A3A8F', gradient: 'linear-gradient(135deg,#1A3A8F,#2552C4)' },
  ];

  return (
    <div className="adm-dashboard">
      <div className="adm-page-header">
        <div>
          <h1>Financial Team Dashboard</h1>
          <p>Deposits, withdrawals, and financial summaries</p>
        </div>
        <div className="adm-header-actions">
          <Link to="/financial/transactions" className="btn btn-warning-outline btn-sm">Transactions</Link>
          <Link to="/financial/messages"     className="btn btn-primary btn-sm">Mail</Link>
        </div>
      </div>

      <div className="adm-stats-grid">
        {loading
          ? Array(6).fill(0).map((_, i) => (
              <div key={i} className="adm-stat-card" style={{ '--gradient': 'linear-gradient(135deg,#334155,#475569)' }}>
                <div className="skeleton" style={{ width: 44, height: 44, borderRadius: '10px' }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ width: '55%', height: 10, marginBottom: 8 }} />
                  <div className="skeleton" style={{ width: '40%', height: 22 }} />
                </div>
              </div>
            ))
          : STAT_CARDS.map(c => <StatCard key={c.label} {...c} />)
        }
      </div>
    </div>
  );
}
