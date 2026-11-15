// LOCATION: src/layouts/RegistrationLayout.jsx
//
// Task 2 — shell for every /registration/* page. Same markup/classes as MarvflowLayout/AdminLayout (reuses AdminLayout.css).
// Navigation contains ONLY onboarding items: there is deliberately no link to balances, deposits, withdrawals or any financial page
// (and the API would refuse them anyway — see RegistrationTeamMiddleware).
//
// NAVIGATION FIX (Admin oversight): /registration/* is its own layout (it is NOT nested inside AdminLayout), so when an Admin opens
// "Registration Team" the whole Admin sidebar is replaced by this one, and this one had no route back. An Admin now gets a
// "Back to Admin Dashboard" link in BOTH the sidebar (desktop and the mobile drawer) and the top bar (so it is reachable on a phone with the
// drawer closed). Registration Team members/leads never see it: it is rendered only when the signed-in user is an Admin, and the Admin
// area itself is still protected by AdminRoute + the server-side admin middleware. A Logout control is also in the top bar on every size.
import { useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useStaffAccess from '../hooks/useStaffAccess';
import {
  FiGrid, FiUsers, FiActivity, FiBell, FiLogOut, FiMenu, FiX, FiChevronRight, FiUserCheck, FiMail, FiFileText, FiArrowLeft,
} from 'react-icons/fi';
import './AdminLayout.css';
import './RegistrationLayout.css';

const ADMIN_DASHBOARD_PATH = '/admin/dashboard';

const NAV_ITEMS = [
  { to: '/registration/dashboard',     icon: FiGrid,     label: 'Dashboard'     },
  { to: '/registration/applications',  icon: FiUsers,    label: 'Applications'  },
  { to: '/registration/activity',      icon: FiActivity, label: 'Activity Log'  },
  { to: '/registration/notifications', icon: FiBell,     label: 'Notifications' },
  { to: '/registration/profile',       icon: FiUserCheck, label: 'My account'   },
];

export default function RegistrationLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  // Integration: Mailing / News & Media appear ONLY when this staff member holds a permission for them (the API enforces it independently).
  const { canMail, canNews } = useStaffAccess(user);
  const staffExtra = [
    ...(canMail ? [{ to: '/registration/mailing', icon: FiMail, label: 'Mailing' }] : []),
    ...(canNews ? [{ to: '/registration/news', icon: FiFileText, label: 'News & Media' }] : []),
  ];
  const isAdmin = user?.role === 'admin' || user?.is_admin === true;
  const roleLabel = user?.role === 'registration_lead' ? 'Team Lead' : isAdmin ? 'Administrator' : 'Team Member';
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="admin-layout reg-layout">
      <aside className={`adm-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="adm-sidebar__header">
          <Link to="/registration/dashboard" className="adm-logo">
            <FiUserCheck size={18} />
            <span>SSI<b>Registration</b></span>
          </Link>
          <button className="adm-close-btn" onClick={closeSidebar} aria-label="Close menu"><FiX size={18} /></button>
        </div>

        <div className="adm-sidebar__user">
          <div className="adm-user-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'R'}</div>
          <div>
            <span className="adm-user-name">{user?.name || 'Team Member'}</span>
            <span className="adm-user-role">{roleLabel}</span>
          </div>
        </div>

        <nav className="adm-nav" aria-label="Registration Team navigation">
          {isAdmin && (
            <div className="reg-admin-return">
              <Link to={ADMIN_DASHBOARD_PATH} className="adm-nav-item reg-back-link" onClick={closeSidebar}>
                <FiArrowLeft size={17} />
                <span>Back to Admin Dashboard</span>
              </Link>
              <span className="reg-admin-return__note">Viewing as Administrator</span>
            </div>
          )}
          {[...NAV_ITEMS, ...staffExtra].map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `adm-nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
              <Icon size={17} />
              <span>{label}</span>
              <FiChevronRight size={13} className="adm-chevron" />
            </NavLink>
          ))}
        </nav>

        <div className="adm-sidebar__footer">
          <button className="adm-logout-btn" onClick={logout}><FiLogOut size={15} /><span>Logout</span></button>
        </div>
      </aside>

      {sidebarOpen && <div className="adm-overlay" onClick={closeSidebar} />}

      <div className="adm-main">
        <header className="adm-topbar">
          <button className="adm-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><FiMenu size={22} /></button>
          {isAdmin && (
            <Link to={ADMIN_DASHBOARD_PATH} className="reg-topbar-back" aria-label="Back to Admin Dashboard" title="Back to Admin Dashboard">
              <FiArrowLeft size={16} />
              <span className="reg-topbar-back__label">Admin Dashboard</span>
            </Link>
          )}
          <div className="adm-topbar__badge"><span className="adm-live-dot" />Registration Team Dashboard</div>
          <div className="adm-topbar__right">
            <NavLink to="/registration/notifications" className="adm-topbar-icon" aria-label="Notifications"><FiBell size={19} /></NavLink>
            <button type="button" className="adm-topbar-icon reg-topbar-logout" onClick={logout} aria-label="Log out" title="Log out"><FiLogOut size={18} /></button>
            <div className="adm-topbar-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'R'}</div>
          </div>
        </header>
        <div className="adm-content page-enter"><Outlet /></div>
      </div>
    </div>
  );
}
