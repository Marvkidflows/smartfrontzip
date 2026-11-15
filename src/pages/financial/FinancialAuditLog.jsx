// LOCATION: src/pages/financial/FinancialAuditLog.jsx
//
// Read-only audit trail for every sensitive Financial Team action
// (wallet adjustments, record corrections, approvals/rejections/holds,
// notices and broadcasts). Backed by GET /financial/audit-logs
// (FinancialTransactionController::auditLogs). There is no edit or
// delete affordance anywhere in this page — the backend has no such
// endpoint either.
import { useState, useEffect, useCallback } from 'react';
import { FiSearch } from 'react-icons/fi';
import { financialService } from '../../services/api';
import toast from 'react-hot-toast';
import '../admin/AdminPages.css';
import './FinancialPages.css';

export default function FinancialAuditLog() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    financialService.getAuditLogs({ search: search || undefined, per_page: 25, page })
      .then(res => { setRows(res.data.data || []); setMeta(res.data.meta || { page: 1, last_page: 1, total: 0 }); })
      .catch(() => toast.error('Failed to load audit log'))
      .finally(() => setLoading(false));
  }, [search, page]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div><h1>Financial Audit Log</h1><p>Permanent, read-only record of every sensitive Financial Team action</p></div>
      </div>

      <div className="adm-card">
        <div className="adm-search" style={{ maxWidth: 420 }}>
          <FiSearch /><input placeholder="Search by reference, actor, or reason…" value={search}
            onChange={e => { setPage(1); setSearch(e.target.value); }} />
        </div>
      </div>

      <div className="adm-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className="adm-empty"><p>No audit records found.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {rows.map(a => (
              <div key={a.id} className="fin-audit-card">
                <div className="fin-audit-card__head">
                  <strong>{a.action}</strong>
                  <span style={{ color: 'var(--gray-400)' }}>{a.reference}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--gray-600)' }}>
                  {a.entity_type} #{a.entity_id}{a.investor_name ? ` · ${a.investor_name}` : ''}
                </div>
                {a.previous_value && a.new_value && (
                  <div className="fin-diff">
                    <div className="fin-diff__before"><h5>Before</h5>{Object.entries(a.previous_value).map(([k, v]) => <div key={k}>{k}: {String(v)}</div>)}</div>
                    <div className="fin-diff__after"><h5>After</h5>{Object.entries(a.new_value).map(([k, v]) => <div key={k}>{k}: {String(v)}</div>)}</div>
                  </div>
                )}
                {a.reason && <div style={{ fontSize: '0.82rem' }}>Reason: {a.reason}</div>}
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                  By {a.actor_name} ({a.actor_role}) · {new Date(a.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="fin-pager">
          <span>Page {meta.page} of {meta.last_page} · {meta.total} records</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
            <button className="btn btn-ghost btn-sm" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
