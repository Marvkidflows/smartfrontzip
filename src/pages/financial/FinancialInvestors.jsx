// LOCATION: src/pages/financial/FinancialInvestors.jsx
//
// Financial Team — investor list. Mirrors AdminUsers.jsx but read-only
// on account status (no suspend/activate here — that stays an admin-only
// power). Financial's job on this page is: find an investor, view them,
// add/deduct funds. Reuses AdminLayout's adm-* classes/CSS.
import { useState, useEffect } from 'react';
import { NameWithRank } from '../../components/RankBadge';
import { Link } from 'react-router-dom';
import { FiUsers, FiSearch, FiEye } from 'react-icons/fi';
import { financialService } from '../../services/api';
import toast from 'react-hot-toast';
import '../admin/AdminPages.css';

export default function FinancialInvestors() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    financialService.getInvestors()
      .then(res => setUsers(res.data?.users || res.data || []))
      .catch(() => toast.error('Failed to load investors'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div><h1>Investors</h1><p>View investor accounts and manage their balances</p></div>
      </div>

      <div className="adm-card">
        <div className="adm-card__header">
          <h3 className="adm-card__title" style={{ margin:0 }}>All Investors ({users.length})</h3>
          <div className="adm-search">
            <FiSearch size={15} />
            <input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:'2rem', color:'var(--gray-400)' }}>Loading investors…</div>
        ) : filtered.length === 0 ? (
          <div className="adm-empty"><FiUsers size={36}/><p>No investors found</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Investor</th><th>Email</th><th>Balance</th>
                  <th>Account Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                        <div className="adm-user-avatar" style={{ width:34,height:34,fontSize:'0.82rem' }}>
                          {(u.name||'?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight:600, fontSize:'0.88rem', color:'var(--navy)' }}><NameWithRank name={u.name} rank={u.rank} /></div>
                          <div style={{ fontSize:'0.72rem', color:'var(--gray-400)' }}>#{u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize:'0.85rem' }}>{u.email}</td>
                    <td><strong>${parseFloat(u.balance || 0).toLocaleString()}</strong></td>
                    <td>
                      <span className={`badge badge-${u.status==='active'?'success':u.status==='suspended'?'danger':'warning'}`}>
                        {u.status || 'active'}
                      </span>
                    </td>
                    <td>
                      <Link to={`/financial/investors/${u.id}`} className="btn btn-ghost btn-sm"><FiEye size={13}/> View</Link>
                    </td>
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