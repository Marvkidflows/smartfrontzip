// LOCATION: src/pages/marvflow/MarvflowNotifications.jsx
//
// Mirrors FinancialNotifications.jsx exactly — new request / reply /
// status-update alerts pushed via MarvflowNotificationService on the
// backend, read through the same generic NotificationController every
// other role already uses.
import { useState, useEffect } from 'react';
import { FiBell, FiTrash2, FiInbox, FiMessageCircle, FiRefreshCw } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { marvflowService } from '../../services/api';
import toast from 'react-hot-toast';
import '../admin/AdminPages.css';

const TYPE_ICON = { new_request: FiInbox, reply: FiMessageCircle, status_update: FiRefreshCw, marvflow_message: FiMessageCircle };

export default function MarvflowNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    marvflowService.getNotifications()
      .then(res => setNotifications(res.data?.notifications || []))
      .catch(() => toast.error('Failed to load notifications'))
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (id) => {
    try {
      await marvflowService.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date() } : n));
    } catch { /* non-critical — leave it unread rather than surface an error toast */ }
  };

  const remove = async (id) => {
    try {
      await marvflowService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch { toast.error('Failed to delete notification'); }
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div>
          <h1>Notifications {unreadCount > 0 && <span className="badge badge-warning">{unreadCount}</span>}</h1>
          <p>New requests, replies, and status changes</p>
        </div>
      </div>

      <div className="adm-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>Loading…</div>
        ) : notifications.length === 0 ? (
          <div className="adm-empty"><FiBell size={28} /><p>No notifications yet.</p></div>
        ) : (
          notifications.map(n => {
            const type = n.data?.type || 'marvflow';
            const Icon = TYPE_ICON[type] || FiBell;
            const isUnread = !n.read_at;
            const requestId = n.data?.team_request_id;
            return (
              <div key={n.id} className="msg-item" style={{ cursor: isUnread ? 'pointer' : 'default', opacity: isUnread ? 1 : 0.7 }}
                onClick={() => isUnread && markRead(n.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                    <Icon size={16} style={{ marginTop: '0.15rem', color: 'var(--royal)', flexShrink: 0 }} />
                    <div>
                      <div className="msg-item__subject">
                        {n.title}
                        {isUnread && <span className="fx-pending-badge">New</span>}
                      </div>
                      <small style={{ color: 'var(--gray-400)' }}>{n.message}</small>
                      {n.data?.type === 'marvflow_message' && n.data?.link && (
                        <div><Link to={`${n.data.link}${n.data.thread_id ? `?thread=${n.data.thread_id}` : ''}`} style={{ fontSize: '0.78rem' }}>Open conversation →</Link></div>
                      )}
                      {requestId && (
                        <div><Link to={`/marvflow/requests/${requestId}`} style={{ fontSize: '0.78rem' }}>View request →</Link></div>
                      )}
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); remove(n.id); }}>
                    <FiTrash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
