// LOCATION: src/pages/marvflow/MarvflowTeamMembers.jsx
import { useState, useEffect } from 'react';
import { FiUsers } from 'react-icons/fi';
import { marvflowService } from '../../services/api';
import toast from 'react-hot-toast';
import '../admin/AdminPages.css';

export default function MarvflowTeamMembers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    marvflowService.getTeam()
      .then(res => setMembers(res.data?.members || []))
      .catch(() => toast.error('Failed to load team members'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div><h1>Team Members</h1><p>MarvFlow Technologies development team</p></div>
      </div>

      <div className="adm-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>Loading…</div>
        ) : members.length === 0 ? (
          <div className="adm-empty"><FiUsers size={36} /><p>No team members found.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Member</th><th>Email</th><th>Role</th><th>Assigned</th><th>Open</th></tr></thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="adm-user-avatar" style={{ width: 34, height: 34, fontSize: '0.82rem' }}>
                          {(m.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--navy)' }}>{m.name}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{m.email}</td>
                    <td>
                      <span className={`badge badge-${m.role === 'marvflow_lead' ? 'warning' : 'info'}`}>
                        {m.role === 'marvflow_lead' ? 'Team Lead' : 'Team Member'}
                      </span>
                    </td>
                    <td>{m.assigned_count}</td>
                    <td>{m.open_count}</td>
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
