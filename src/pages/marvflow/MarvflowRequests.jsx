// LOCATION: src/pages/marvflow/MarvflowRequests.jsx
//
// One component, three routes (see App.jsx): /marvflow/requests (all),
// /marvflow/urgent (priority=urgent, forced), /marvflow/my-requests
// (assigned_to=me, forced). `forcedFilter` locks that one filter out of
// the user's control so "Urgent" always means urgent, not "urgent by
// default but the person can clear it."
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiInbox, FiSearch, FiEye } from 'react-icons/fi';
import { marvflowService } from '../../services/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import '../admin/AdminPages.css';

const PRIORITY_BADGE = { normal: 'info', high: 'warning', urgent: 'danger' };
const STATUS_BADGE = {
  new: 'info', acknowledged: 'warning', in_progress: 'warning',
  waiting_for_info: 'warning', resolved: 'success', closed: 'default',
};

export default function MarvflowRequests({ title = 'Requests', forcedFilter = null }) {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState(forcedFilter?.priority || '');

  const fetchRequests = () => {
    setLoading(true);
    const params = { search: search || undefined, status: status || undefined };
    if (forcedFilter?.priority) params.priority = forcedFilter.priority;
    else if (priority) params.priority = priority;
    if (forcedFilter?.assigned_to === 'me') params.assigned_to = user?.id;

    marvflowService.getRequests(params)
      .then(res => setRequests(res.data?.requests || []))
      .catch(() => toast.error('Failed to load requests'))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchRequests(); }, [status, priority]);

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div><h1>{title}</h1><p>Search, filter, and manage development requests</p></div>
      </div>

      <div className="adm-card">
        <div className="adm-card__header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div className="adm-search">
            <FiSearch size={15} />
            <input
              placeholder="Search by ID, subject, or sender…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchRequests()}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select className="form-control" style={{ width: 170 }} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting_for_info">Waiting for Info</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            {!forcedFilter?.priority && (
              <select className="form-control" style={{ width: 140 }} value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="">All Priorities</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            )}
            <button className="btn btn-ghost btn-sm" onClick={fetchRequests}>Search</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>Loading…</div>
        ) : requests.length === 0 ? (
          <div className="adm-empty"><FiInbox size={36} /><p>No requests match your filters.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>ID</th><th>Sender</th><th>Subject</th><th>Priority</th><th>Status</th><th>Assigned</th><th>Date</th><th></th></tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 700, color: 'var(--navy)' }}>{r.display_id}</td>
                    <td>
                      {r.sender_name}
                      <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', textTransform: 'capitalize' }}>{r.sender_role}</div>
                    </td>
                    <td>{r.subject}</td>
                    <td><span className={`badge badge-${PRIORITY_BADGE[r.priority]}`}>{r.priority}</span></td>
                    <td><span className={`badge badge-${STATUS_BADGE[r.status]}`}>{r.status.replace(/_/g, ' ')}</span></td>
                    <td>{r.assigned_to || <span style={{ color: 'var(--gray-400)' }}>Unassigned</span>}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                    <td><Link to={`/marvflow/requests/${r.id}`} className="btn btn-ghost btn-sm"><FiEye size={13} /> View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
