// LOCATION: src/pages/registration/RegistrationNotifications.jsx
// Task 2 — in-app alerts for the Registration Team (page opened, started, submitted, KYC submitted, incomplete). Alerts carry no contact details.
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiBell, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { registrationService } from '../../services/api';
import '../admin/AdminPages.css';

export default function RegistrationNotifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    registrationService.getNotifications()
      .then(res => setItems(res.data?.notifications || []))
      .catch(() => { setError('Failed to load notifications.'); toast.error('Failed to load notifications'); })
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (id) => {
    try { await registrationService.markNotificationRead(id); setItems(p => p.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)); }
    catch { /* non-critical */ }
  };
  const remove = async (id) => {
    try { await registrationService.deleteNotification(id); setItems(p => p.filter(n => n.id !== id)); }
    catch { toast.error('Failed to delete notification'); }
  };
  const unread = items.filter(n => !n.read_at).length;

  return (
    <div className="adm-page">
      <div className="adm-page-header"><div><h1>Notifications {unread > 0 && <span className="badge badge-warning">{unread}</span>}</h1><p>Registration and KYC alerts</p></div></div>
      <div className="adm-card">
        {error ? <div role="alert" style={{ color: 'var(--danger)' }}>{error}</div>
          : loading ? <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>Loading…</div>
          : items.length === 0 ? <div className="adm-empty"><FiBell size={28} /><p>No notifications yet.</p></div>
          : items.map(n => (
            <div key={n.id} onClick={() => !n.read_at && markRead(n.id)}
              style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', padding: '0.75rem 0', borderBottom: '1px solid var(--gray-200)', opacity: n.read_at ? 0.65 : 1, cursor: n.read_at ? 'default' : 'pointer' }}>
              <div>
                <strong>{n.title}</strong>
                <div style={{ fontSize: '0.84rem' }}>{n.message}</div>
                <small style={{ color: 'var(--gray-500)' }}>{n.created_at}</small>
                {n.data?.application_id && <> · <Link to={`/registration/applications/${n.data.application_id}`}>Open application #{n.data.application_id}</Link></>}
              </div>
              <button className="btn btn-ghost btn-sm" aria-label="Delete notification" onClick={(e) => { e.stopPropagation(); remove(n.id); }}><FiTrash2 size={14} /></button>
            </div>
          ))}
      </div>
    </div>
  );
}
