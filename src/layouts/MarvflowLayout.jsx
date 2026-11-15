// LOCATION: src/layouts/MarvflowLayout.jsx
//
// MarvFlow Team Dashboard — sidebar/topbar shell for every /marvflow/*
// page. Mirrors AdminLayout.jsx's exact markup/classes (adm-sidebar,
// adm-nav-item, adm-main, adm-topbar, etc. — reusing AdminLayout.css)
// rather than inventing a parallel design system, per the spec's
// instruction to reuse the existing design system. This is MarvFlow
// Technologies' OWN dashboard — entirely separate from Smart System
// Investment's admin/financial dashboards, both in access
// (MarvflowMiddleware never admits an admin) and in content (nothing
// here shows SSI's financial data — only development requests).
import { useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useStaffAccess from '../hooks/useStaffAccess';
import { marvflowService } from '../services/api';
import useNavUnread from '../components/useNavUnread';
import {
  FiGrid, FiInbox, FiAlertTriangle, FiUser, FiUsers, FiBell, FiMail, FiMessageCircle,
  FiLogOut, FiMenu, FiX, FiChevronRight, FiCode, FiFileText,
} from 'react-icons/fi';
import './AdminLayout.css';

const NAV_ITEMS = [
  { to: '/marvflow/dashboard',      icon: FiGrid,          label: 'Dashboard'            },
  { to: '/marvflow/requests',       icon: FiInbox,         label: 'Requests'             },
  { to: '/marvflow/urgent',         icon: FiAlertTriangle, label: 'Urgent'               },
  { to: '/marvflow/my-requests',    icon: FiUser,          label: 'My Assigned Requests' },
  { to: '/marvflow/messages',       icon: FiMail,          label: 'Compose Email'        },
  { to: '/marvflow/message-admin',  icon: FiMessageCircle, label: 'Message Admin'        },
  { to: '/marvflow/team',           icon: FiUsers,         label: 'Team Members'         },
  { to: '/marvflow/notifications',  icon: FiBell,          label: 'Notifications'        },
  { to: '/marvflow/profile',        icon: FiUser,          label: 'Profile'              },
];

export default function MarvflowLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  // Integration: Mailing / News & Media appear ONLY when this staff member holds a permission for them (the API enforces it independently).
  const { canMail, canNews } = useStaffAccess(user);
  const staffExtra = [
    ...(canMail ? [{ to: '/marvflow/mailing', icon: FiMail, label: 'Mailing' }] : []),
    ...(canNews ? [{ to: '/marvflow/news', icon: FiFileText, label: 'News & Media' }] : []),
  ];
  const marvUnread = useNavUnread(marvflowService.getUnreadMessageCount).unread_by_kind || {};   // unread SSI replies, per kind

  return (
    <div className="admin-layout">
      <aside className={`adm-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="adm-sidebar__header">
          <Link to="/marvflow/dashboard" className="adm-logo">
            <FiCode size={18} />
            <span>MarvFlow<b>Team</b></span>
          </Link>
          <button className="adm-close-btn" onClick={() => setSidebarOpen(false)}>
            <FiX size={18} />
          </button>
        </div>

        <div className="adm-sidebar__user">
          <div className="adm-user-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || 'M'}
          </div>
          <div>
            <span className="adm-user-name">{user?.name || 'Team Member'}</span>
            <span className="adm-user-role">{user?.role === 'marvflow_lead' ? 'Team Lead' : 'Team Member'}</span>
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
              {[['/marvflow/messages', marvUnread.email], ['/marvflow/message-admin', marvUnread.direct]].map(([path, n]) => to === path && n > 0 && (
                <span key={path} className="adm-nav-badge" aria-label={`${n} unread replies`}>{n > 99 ? '99+' : n}</span>
              ))}
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
            MarvFlow Team Dashboard
          </div>
          <div className="adm-topbar__right">
            <NavLink to="/marvflow/notifications" className="adm-topbar-icon"><FiBell size={19} /></NavLink>
            <div className="adm-topbar-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || 'M'}
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
