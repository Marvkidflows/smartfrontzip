import { useState, useEffect } from 'react';
import { NameWithRank } from '../components/RankBadge';
import { Outlet, NavLink, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import {
  FiGrid, FiTrendingUp, FiLayers, FiDollarSign, FiArrowUpCircle,
  FiMessageSquare, FiUser, FiBell, FiGift, FiLogOut,
  FiAward, FiMenu, FiX, FiChevronRight, FiCheckSquare, FiFileText, FiMail, FiPieChart, FiTarget
} from 'react-icons/fi';
import './InvestorLayout.css';

const NAV_ITEMS = [
  { to: '/investor/dashboard',     icon: FiGrid,          label: 'Dashboard'     },
  { to: '/investor/sectors',       icon: FiLayers,        label: 'Sectors'       },
  { to: '/investor/investments',   icon: FiTrendingUp,    label: 'Investments'   },
  { to: '/investor/tasks',         icon: FiCheckSquare,   label: 'Tasks'         },
  { to: '/investor/market',        icon: FiPieChart,      label: 'Live Market'   },
  { to: '/investor/predictions',   icon: FiTarget,        label: 'Gaming & Prediction' },
  { to: '/investor/deposits',      icon: FiDollarSign,    label: 'Deposits'      },
  { to: '/investor/withdrawals',   icon: FiArrowUpCircle, label: 'Withdrawals'   },
  { to: '/investor/messages',      icon: FiMessageSquare, label: 'Messages'      },
  { to: '/investor/emails',        icon: FiMail,          label: 'Email History' },
  { to: '/investor/news',          icon: FiFileText,      label: 'News & Updates' },   // Integration: single news entry (Task 4 module; legacy announcements stay reachable from inside it)
  { to: '/investor/notifications', icon: FiBell,          label: 'Notifications' },
  { to: '/investor/referrals',     icon: FiGift,          label: 'Referrals'     },
  { to: '/investor/rank',          icon: FiAward,         label: 'My Rank'       },
  { to: '/investor/profile',       icon: FiUser,          label: 'Profile'       },
];

export default function InvestorLayout() {
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [showBellDrop, setShowBellDrop]   = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [msgUnread, setMsgUnread]         = useState(0);
  const { user, logout, refreshRank } = useAuthStore();

  // Keep the rank badge current without a re-login: refresh on mount, when the tab
  // regains focus, and once a minute. (Read-only endpoint; backend is authoritative.)
  useEffect(() => {
    refreshRank();
    const onVisible = () => { if (document.visibilityState === 'visible') refreshRank(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refreshRank);
    const t = setInterval(refreshRank, 60000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refreshRank);
      clearInterval(t);
    };
  }, [refreshRank]);

  // ── Fetch counts on mount ─────────────────────────────────────────────────
  useEffect(() => {
    // Unread notifications
    api.get('/investor-investment/notifications')
      .then(res => setNotifications(res.data?.notifications || []))
      .catch(() => {});

    // Announcements for bell dropdown
    api.get('/investor-investment/announcements')
      .then(res => setAnnouncements(res.data?.announcements || []))
      .catch(() => {});

    // Unread messages from admin
    // Read-only count: the thread endpoint marks messages read as a side effect.
    api.get('/investor-investment/messages/unread-count')
      .then(res => setMsgUnread(res.data?.unread_count || 0))
      .catch(() => {});
  }, []);

  const unreadNotifs  = notifications.filter(n => !n.read_at).length;
  const totalBellBadge = unreadNotifs + announcements.length + msgUnread;

  return (
    <div className="investor-layout">

      {/* ── SIDEBAR ── */}
      <aside className={`inv-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="inv-sidebar__header">
          <Link to="/" className="inv-logo">
            <span className="inv-logo__icon"><img src="/logo-mark.png" alt="Smart System Investment" /></span>
            <span>Smart<b>System</b></span>
          </Link>
          <button className="inv-close-btn" onClick={() => setSidebarOpen(false)}>
            <FiX size={18} />
          </button>
        </div>

        <div className="inv-sidebar__user">
          <div className="inv-user-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="inv-user-info">
            <span className="inv-user-name"><NameWithRank name={user?.name || 'Investor'} rank={user?.rank} size="sm" showUnranked /></span>
            <span className="inv-user-role">Investor Account</span>
          </div>
        </div>

        <nav className="inv-nav">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `inv-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>

              {/* Badge on Notifications nav item */}
              {label === 'Notifications' && totalBellBadge > 0 && (
                <span className="inv-nav-badge">{totalBellBadge > 99 ? '99+' : totalBellBadge}</span>
              )}

              {/* Badge on Messages nav item */}
              {label === 'Messages' && msgUnread > 0 && (
                <span className="inv-nav-badge">{msgUnread}</span>
              )}

              <FiChevronRight size={14} className="inv-nav-chevron" />
            </NavLink>
          ))}
        </nav>

        <div className="inv-sidebar__footer">
          <button className="inv-logout-btn" onClick={logout}>
            <FiLogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── SIDEBAR OVERLAY ── */}
      {sidebarOpen && (
        <div className="inv-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="inv-main">
        <header className="inv-topbar">
          <button className="inv-menu-btn" onClick={() => setSidebarOpen(true)}>
            <FiMenu size={22} />
          </button>

          <div className="inv-topbar__title">Investor Portal</div>

          <div className="inv-topbar__right">

            {/* Messages icon with unread badge */}
            <NavLink to="/investor/messages" className="inv-topbar-icon" style={{ position: 'relative' }}>
              <FiMessageSquare size={20} />
              {msgUnread > 0 && (
                <span className="inv-topbar-badge">{msgUnread}</span>
              )}
            </NavLink>

            {/* Bell icon with dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                className="inv-topbar-icon"
                onClick={() => setShowBellDrop(v => !v)}
                style={{ border: 'none', cursor: 'pointer', position: 'relative' }}
              >
                <FiBell size={20} />
                {totalBellBadge > 0 && (
                  <span className="inv-topbar-badge">
                    {totalBellBadge > 99 ? '99+' : totalBellBadge}
                  </span>
                )}
              </button>

              {/* ── BELL DROPDOWN ── */}
              {showBellDrop && (
                <>
                  {/* click outside to close */}
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 299 }}
                    onClick={() => setShowBellDrop(false)}
                  />

                  <div className="inv-bell-drop">
                    {/* Header */}
                    <div className="inv-bell-drop__header">
                      <span>Notifications</span>
                      <NavLink
                        to="/investor/notifications"
                        className="inv-bell-drop__viewall"
                        onClick={() => setShowBellDrop(false)}
                      >
                        View all
                      </NavLink>
                    </div>

                    <div className="inv-bell-drop__list">

                      {/* ── ANNOUNCEMENTS (from admin) ── */}
                      {announcements.length > 0 && (
                        <div className="inv-bell-drop__section-label">📢 Announcements</div>
                      )}
                      {announcements.slice(0, 3).map(a => (
                        <div key={`ann-${a.id}`} className="inv-bell-drop__item inv-bell-drop__item--ann">
                          <div className="inv-bell-drop__item-icon" style={{ background: 'rgba(26,58,143,0.1)', color: 'var(--royal)' }}>
                            📢
                          </div>
                          <div className="inv-bell-drop__item-body">
                            <div className="inv-bell-drop__item-title">{a.title}</div>
                            <div className="inv-bell-drop__item-msg">
                              {(a.content || '').slice(0, 65)}{(a.content || '').length > 65 ? '…' : ''}
                            </div>
                            <div className="inv-bell-drop__item-time">{a.time_ago ?? a.created_at}</div>
                          </div>
                          <span className="inv-bell-drop__new-tag">New</span>
                        </div>
                      ))}

                      {/* ── UNREAD NOTIFICATIONS ── */}
                      {unreadNotifs > 0 && (
                        <div className="inv-bell-drop__section-label">🔔 Activity</div>
                      )}
                      {notifications.filter(n => !n.read_at).slice(0, 4).map(n => (
                        <div key={n.id} className="inv-bell-drop__item inv-bell-drop__item--unread">
                          <div className="inv-bell-drop__item-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
                            🔔
                          </div>
                          <div className="inv-bell-drop__item-body">
                            <div className="inv-bell-drop__item-title">
                              {n.title ?? n.data?.title ?? 'Notification'}
                            </div>
                            <div className="inv-bell-drop__item-msg">
                              {(n.message ?? n.data?.message ?? '').slice(0, 65)}
                            </div>
                            <div className="inv-bell-drop__item-time">{n.created_at}</div>
                          </div>
                          <div className="inv-bell-drop__unread-dot" />
                        </div>
                      ))}

                      {/* ── UNREAD MESSAGES FROM ADMIN ── */}
                      {msgUnread > 0 && (
                        <NavLink
                          to="/investor/messages"
                          className="inv-bell-drop__item inv-bell-drop__item--msg"
                          onClick={() => setShowBellDrop(false)}
                        >
                          <div className="inv-bell-drop__item-icon" style={{ background: 'var(--gold-glow)', color: 'var(--gold)' }}>
                            💬
                          </div>
                          <div className="inv-bell-drop__item-body">
                            <div className="inv-bell-drop__item-title">New message from Support</div>
                            <div className="inv-bell-drop__item-msg">
                              You have {msgUnread} unread {msgUnread === 1 ? 'message' : 'messages'} from our team
                            </div>
                          </div>
                          <span className="inv-bell-drop__new-tag" style={{ background: 'var(--gold)', color: 'var(--navy)' }}>
                            {msgUnread}
                          </span>
                        </NavLink>
                      )}

                      {/* ── EMPTY STATE ── */}
                      {announcements.length === 0 && unreadNotifs === 0 && msgUnread === 0 && (
                        <div className="inv-bell-drop__empty">
                          <FiBell size={28} />
                          <p>You're all caught up!</p>
                          <small>No new notifications</small>
                        </div>
                      )}
                    </div>

                    {/* Footer link */}
                    <NavLink
                      to="/investor/notifications"
                      className="inv-bell-drop__footer"
                      onClick={() => setShowBellDrop(false)}
                    >
                      See all notifications & announcements →
                    </NavLink>
                  </div>
                </>
              )}
            </div>

            {/* Profile avatar */}
            <NavLink to="/investor/profile" className="inv-topbar-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </NavLink>
          </div>
        </header>

        <div className="inv-content page-enter">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
