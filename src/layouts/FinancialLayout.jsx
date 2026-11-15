// FinancialLayout.jsx
//
// Financial Team dashboard — sidebar/topbar shell for every /financial/*
// page. Deliberately mirrors AdminLayout's structure and reuses its
// stylesheet (AdminLayout.css — same adm-* classes) rather than
// inventing a parallel design system. The nav list covers the sections
// the financial role has route access to: Dashboard, Investors (view +
// add/deduct balance only — no suspend/activate/freeze, those stay
// admin-only), Deposits, Withdrawals, Transactions, Investments,
// Notifications, Profile — no Tasks/Plans/Sectors/Global Mgmt/KYC/Email
// Center/Announcements/Analytics links, since those are admin-only
// areas the financial role has no route access to anyway. This is a
// UI-level reflection of that boundary, not the enforcement of it —
// FinancialMiddleware on the backend is what actually blocks access.
import { useState, useEffect } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useStaffAccess from '../hooks/useStaffAccess';
import { financialService, marvflowInboxService } from '../services/api';
import useNavUnread from '../components/useNavUnread';
import {
  FiGrid, FiDollarSign, FiArrowUpCircle, FiRepeat, FiTrendingUp,
  FiBell, FiUser, FiLogOut, FiMenu, FiX, FiChevronRight, FiShield, FiUsers, FiLifeBuoy,
  FiUsers as FiTeam, FiMail, FiClipboard, FiGlobe, FiGift, FiPercent, FiFileText,
} from 'react-icons/fi';
import './AdminLayout.css';
import '../pages/financial/FinancialPages.css';

const NAV_ITEMS = [
  { to: '/financial/dashboard',     icon: FiGrid,          label: 'Dashboard'     },
  { to: '/financial/investors',     icon: FiUsers,         label: 'Investors'     },
  { to: '/financial/deposits',      icon: FiDollarSign,    label: 'Deposits'      },
  { to: '/financial/withdrawals',   icon: FiArrowUpCircle, label: 'Withdrawals'   },
  { to: '/financial/transactions',  icon: FiRepeat,        label: 'Transactions'  },
  { to: '/financial/investments',   icon: FiTrendingUp,    label: 'Investments'   },
  { to: '/financial/messages',      icon: FiMail,          label: 'Mail'          },
  { to: '/financial/audit-log',     icon: FiClipboard,     label: 'Audit Log'     },
  { to: '/financial/currency',      icon: FiGlobe,         label: 'Currency (USD)' },
  { to: '/financial/rank-approvals', icon: FiShield,       label: 'Rank approvals' },
  { to: '/financial/referrals',      icon: FiGift,          label: 'Referral rewards' },
  { to: '/financial/withdrawal-fees', icon: FiPercent,      label: 'Withdrawal fees' },
  { to: '/financial/approvals',     icon: FiClipboard,     label: 'Approvals'      },
  { to: '/financial/notifications', icon: FiBell,          label: 'Notifications' },
  { to: '/financial/profile',       icon: FiUser,          label: 'Profile'       },
  { to: '/financial/dev-requests',  icon: FiLifeBuoy,      label: 'Contact Dev Team' },
  { to: '/financial/staff-messages', icon: FiTeam,         label: 'Admin Channel' },
  { to: '/financial/marvflow-messages', icon: FiMail,     label: 'MarvFlow Messages' },
];

export default function FinancialLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  // Integration: Mailing / News & Media appear ONLY when this staff member holds a permission for them (the API enforces it independently).
  const { canMail, canNews } = useStaffAccess(user);
  const staffExtra = [
    ...(canMail ? [{ to: '/financial/mailing', icon: FiMail, label: 'Mailing' }] : []),
    ...(canNews ? [{ to: '/financial/news', icon: FiFileText, label: 'News & Media' }] : []),
  ];
  const [mailUnread, setMailUnread] = useState(0);
  const marvUnread = useNavUnread(marvflowInboxService.unreadCount).unread_count || 0;   // unread MarvFlow messages for the Financial inbox

  // Lightweight badge poll for unread investor mail (read-only endpoint).
  useEffect(() => {
    const load = () => financialService.getMessageUnread()
      .then(r => setMailUnread(r.data?.unread || 0)).catch(() => {});
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="admin-layout">
      <aside className={`adm-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="adm-sidebar__header">
          <Link to="/financial/dashboard" className="adm-logo">
            <FiShield size={18} />
            <span>Financial<b>Team</b></span>
          </Link>
          <button className="adm-close-btn" onClick={() => setSidebarOpen(false)}>
            <FiX size={18} />
          </button>
        </div>

        <div className="adm-sidebar__user">
          <div className="adm-user-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || 'F'}
          </div>
          <div>
            <span className="adm-user-name">{user?.name || 'Financial Team'}</span>
            <span className="adm-user-role">Financial Team</span>
          </div>
        </div>

        <nav className="adm-nav">
          {[...NAV_ITEMS, ...staffExtra].map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `adm-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={17} />
              <span>{label}</span>
              {to === '/financial/marvflow-messages' && marvUnread > 0 && (
                <span className="adm-nav-badge" aria-label={`${marvUnread} unread`}>{marvUnread > 99 ? '99+' : marvUnread}</span>
              )}
              {label === 'Mail' && mailUnread > 0 && (
                <span className="fin-nav-badge">{mailUnread > 99 ? '99+' : mailUnread}</span>
              )}
              <FiChevronRight size={13} className="adm-chevron" />
            </NavLink>
          ))}
        </nav>

        <div className="adm-sidebar__footer">
          <button className="adm-logout-btn" onClick={logout}>
            <FiLogOut size={15} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="adm-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="adm-main">
        <header className="adm-topbar">
          <button className="adm-menu-btn" onClick={() => setSidebarOpen(true)}>
            <FiMenu size={22} />
          </button>
          <div className="adm-topbar__badge">
            <span className="adm-live-dot" />
            Financial Operations
          </div>
          <div className="adm-topbar__right">
            <NavLink to="/financial/notifications" className="adm-topbar-icon"><FiBell size={19} /></NavLink>
            <div className="adm-topbar-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || 'F'}
            </div>
          </div>
        </header>

        <div className="adm-content page-enter">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
