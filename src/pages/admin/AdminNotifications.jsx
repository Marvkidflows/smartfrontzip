import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminNotificationService } from '../../services/rankService';
import { apiError } from '../../services/rankService';
import { fmtDate } from './ranks/rankUtils';
import './AdminPages.css';
import './ranks/AdminRanks.css';

export default function AdminNotifications() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await adminNotificationService.list();
      setItems(r.data.notifications); setUnread(r.data.unread_count);
    } catch (e) { toast.error(apiError(e, 'Could not load notifications.')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const markRead = async (n) => {
    if (n.read_at) return;
    try { await adminNotificationService.read(n.id); setItems((l) => l.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x))); setUnread((u) => Math.max(0, u - 1)); }
    catch { /* non-critical */ }
  };
  const remove = async (n) => {
    try { await adminNotificationService.remove(n.id); setItems((l) => l.filter((x) => x.id !== n.id)); if (!n.read_at) setUnread((u) => Math.max(0, u - 1)); }
    catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="adm-page">
      <div className="adm-page-header"><div><h1>Notifications</h1><p className="rk-muted">{unread} unread</p></div></div>
      {loading && <div className="adm-empty">Loading…</div>}
      {!loading && items.length === 0 && <div className="adm-empty">No notifications.</div>}
      {items.map((n) => {
        const d = n.data || {};
        const isRank = d.type === 'rank_upgrade' || d.type === 'rank_downgrade_review';
        return (
          <div key={n.id} className={`rk-notif ${n.read_at ? '' : 'rk-notif--unread'}`} onClick={() => markRead(n)}>
            <div className="rk-notif__top">
              <strong>{n.title}</strong>
              <span className="rk-muted">{fmtDate(d.occurred_at) !== '—' ? fmtDate(d.occurred_at) : n.created_at}</span>
            </div>
            <div>{n.message}</div>
            {d.type === 'marvflow_message' && d.link && (
              <div><Link to={`${d.link}${d.thread_id ? `?thread=${d.thread_id}` : ''}`} style={{ fontSize: '0.78rem' }}>Open conversation →</Link></div>
            )}
            {isRank && (
              <>
                {d.type === 'rank_upgrade' && (
                  <div className="rk-muted" style={{ marginTop: 4 }}>
                    {d.previous_rank} → <strong>{d.new_rank}</strong> · <span className="rk-mono">{d.account_id}</span> · {d.automatic ? 'Automatic' : 'Manual'}
                    <div>{d.reason}</div>
                    {d.criteria_satisfied?.length > 0 && <ul>{d.criteria_satisfied.map((c, i) => <li key={i}>{c}</li>)}</ul>}
                  </div>
                )}
                {d.type === 'rank_downgrade_review' && d.criteria_not_met?.length > 0 && (
                  <div className="rk-muted" style={{ marginTop: 4 }}>No longer met:<ul>{d.criteria_not_met.map((c, i) => <li key={i}>{c}</li>)}</ul></div>
                )}
                {d.link && <Link to={d.link} className="rk-btn rk-btn--sm" style={{ marginTop: 8, display: 'inline-block', textDecoration: 'none' }}>Review rank &amp; audit history</Link>}
              </>
            )}
            <div style={{ marginTop: 8 }}><button className="rk-btn rk-btn--sm" onClick={(e) => { e.stopPropagation(); remove(n); }}>Dismiss</button></div>
          </div>
        );
      })}
    </div>
  );
}
