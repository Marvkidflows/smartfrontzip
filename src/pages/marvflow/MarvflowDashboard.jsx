// LOCATION: src/pages/marvflow/MarvflowDashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiInbox, FiAlertTriangle, FiClock, FiCheckCircle, FiEye } from 'react-icons/fi';
import { marvflowService } from '../../services/api';
import toast from 'react-hot-toast';
import '../admin/AdminPages.css';

const PRIORITY_BADGE = { normal: 'info', high: 'warning', urgent: 'danger' };
const STATUS_BADGE = {
  new: 'info', acknowledged: 'warning', in_progress: 'warning',
  waiting_for_info: 'warning', resolved: 'success', closed: 'default',
};

export default function MarvflowDashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    marvflowService.getDashboard()
      .then(res => {
        setStats(res.data?.stats);
        setRecent(res.data?.recent || []);
      })
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const cards = stats ? [
    { label: 'Total Requests', value: stats.total_requests, icon: FiInbox,         color: 'var(--navy)'    },
    { label: 'New Requests',   value: stats.new_requests,   icon: FiInbox,         color: 'var(--royal)'   },
    { label: 'Urgent',         value: stats.urgent_requests, icon: FiAlertTriangle, color: 'var(--danger)' },
    { label: 'In Progress',    value: stats.in_progress,    icon: FiClock,         color: 'var(--warning)' },
    { label: 'Resolved',       value: stats.resolved,       icon: FiCheckCircle,  color: 'var(--success)' },
  ] : [];

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div><h1>MarvFlow Team Dashboard</h1><p>Development requests from Smart System Investment</p></div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>Loading…</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
            {cards.map(c => (
              <div key={c.label} className="adm-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: '12px', background: `${c.color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color, flexShrink: 0 }}>
                  <c.icon size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--navy)', lineHeight: 1 }}>{c.value}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: '0.25rem' }}>{c.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="adm-card">
            <div className="adm-card__header">
              <h3 className="adm-card__title" style={{ margin: 0 }}>Recently Received Requests</h3>
              <Link to="/marvflow/requests" className="btn btn-ghost btn-sm">View All</Link>
            </div>
            {recent.length === 0 ? (
              <div className="adm-empty"><FiInbox size={36} /><p>No requests yet.</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>ID</th><th>Sender</th><th>Subject</th><th>Priority</th><th>Status</th><th>Assigned</th><th></th></tr></thead>
                  <tbody>
                    {recent.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 700, color: 'var(--navy)' }}>{r.display_id}</td>
                        <td>{r.sender_name}</td>
                        <td>{r.subject}</td>
                        <td><span className={`badge badge-${PRIORITY_BADGE[r.priority]}`}>{r.priority}</span></td>
                        <td><span className={`badge badge-${STATUS_BADGE[r.status]}`}>{r.status.replace(/_/g, ' ')}</span></td>
                        <td>{r.assigned_to || <span style={{ color: 'var(--gray-400)' }}>Unassigned</span>}</td>
                        <td><Link to={`/marvflow/requests/${r.id}`} className="btn btn-ghost btn-sm"><FiEye size={13} /></Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
