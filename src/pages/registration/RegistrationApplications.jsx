// LOCATION: src/pages/registration/RegistrationApplications.jsx
// Task 2 — searchable, filterable, paginated list of applications. Filters live in the URL so a view can be bookmarked/shared.
import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiEye, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { registrationService } from '../../services/api';
import useAuthStore from '../../store/authStore';
import { STATUS_ORDER, statusBadge, statusLabel, fmtDateTime } from '../../utils/registrationStatus';
import '../admin/AdminPages.css';
import './RegistrationPages.css';

const FILTER_KEYS = ['status', 'search', 'from', 'to', 'date_field', 'assigned', 'kyc_docs', 'overdue', 'page'];

export default function RegistrationApplications() {
  const { user } = useAuthStore();
  const canExport = user?.role === 'registration_lead' || user?.role === 'admin';   // the API enforces the same rule ('registration.decide')
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState(params.get('search') || '');

  const q = Object.fromEntries(FILTER_KEYS.map(k => [k, params.get(k) || '']).filter(([, v]) => v));

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await registrationService.getApplications({ ...q, per_page: 20 });
      setRows(res.data.data); setMeta(res.data.meta);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load applications.';
      setError(msg); toast.error(msg);
    } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString()]);

  useEffect(() => { load(); }, [load]);

  const onSearch = (e) => { e.preventDefault(); setFilter('search', searchText.trim()); };
  const clear = () => { setSearchText(''); setParams({}, { replace: true }); };
  const hasFilters = Object.keys(q).some(k => k !== 'page');
  const exportCsv = async () => {
    try {
      const { page, ...filters } = q;
      const res = await registrationService.exportApplications(filters);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = 'registration-applications.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      toast.success('Export downloaded (your current filters, max 5,000 rows).');
    } catch (err) { toast.error(err.response?.status === 403 ? 'Only a Registration Lead or Admin can export.' : err.response?.status === 429 ? 'Please wait before exporting again.' : 'Export failed.'); }
  };

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div><h1>Applications</h1><p>{meta.total} application{meta.total === 1 ? '' : 's'} match your filters</p></div>
        {canExport && <button className="btn btn-outline btn-sm" onClick={exportCsv} title="CSV of the current filters: no ID numbers, document links or phone numbers">Export CSV</button>}
      </div>

      <div className="adm-card" style={{ marginBottom: '1rem' }}>
        <form onSubmit={onSearch} className="reg-filters">
          <div style={{ display: 'flex', gap: '0.4rem', gridColumn: '1 / -1' }}>
            <input className="form-control" placeholder="Search name, email, phone or application #" value={searchText} onChange={e => setSearchText(e.target.value)} aria-label="Search applications" />
            <button className="btn btn-primary btn-sm" type="submit"><FiSearch size={14} /> Search</button>
          </div>
          <select className="form-control" value={q.status || ''} onChange={e => setFilter('status', e.target.value)} aria-label="Status">
            <option value="">All statuses</option>
            {STATUS_ORDER.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </select>
          <select className="form-control" value={q.assigned || ''} onChange={e => setFilter('assigned', e.target.value)} aria-label="Assignment">
            <option value="">Anyone</option><option value="me">Assigned to me</option><option value="unassigned">Unassigned</option>
          </select>
          <select className="form-control" value={q.kyc_docs || ''} onChange={e => setFilter('kyc_docs', e.target.value)} aria-label="KYC documents">
            <option value="">KYC docs: any</option><option value="yes">KYC docs submitted</option><option value="no">No KYC docs</option>
          </select>
          <select className="form-control" value={q.date_field || 'started_at'} onChange={e => setFilter('date_field', e.target.value)} aria-label="Date field">
            <option value="started_at">Started</option><option value="submitted_at">Submitted</option><option value="kyc_submitted_at">KYC submitted</option><option value="decided_at">Decided</option>
          </select>
          <input type="date" className="form-control" value={q.from || ''} onChange={e => setFilter('from', e.target.value)} aria-label="From date" />
          <input type="date" className="form-control" value={q.to || ''} onChange={e => setFilter('to', e.target.value)} aria-label="To date" />
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
            <input type="checkbox" checked={q.overdue === '1'} onChange={e => setFilter('overdue', e.target.checked ? '1' : '')} /> Incomplete — needs follow-up
          </label>
          {hasFilters && <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>Clear filters</button>}
        </form>
      </div>

      <div className="adm-card">
        {error ? (
          <div role="alert" style={{ color: 'var(--danger)', padding: '1rem' }}>{error} <button className="btn btn-ghost btn-sm" onClick={load}>Retry</button></div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className="adm-empty"><p>{hasFilters ? 'No applications match these filters.' : 'No applications yet.'}</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Applicant</th><th>Status</th><th>Stage</th><th>KYC docs</th><th>Last activity</th><th>Assigned</th><th /></tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.applicant.name || '—'}</strong><div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{r.applicant.email} · #{r.id}</div></td>
                    <td>
                      <span className={statusBadge(r.status)}>{statusLabel(r.status)}</span>
                      {r.overdue_follow_up && <div style={{ fontSize: '0.7rem', color: 'var(--warning)' }}>Needs follow-up</div>}
                    </td>
                    <td>{r.stage_reached}/4{!r.email_verified && <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>email unverified</div>}</td>
                    <td>{r.kyc_documents ? 'Yes' : 'No'}</td>
                    <td style={{ fontSize: '0.82rem' }}>{fmtDateTime(r.last_activity_at)}</td>
                    <td style={{ fontSize: '0.82rem' }}>{r.assigned_to?.name || '—'}</td>
                    <td><Link className="btn btn-ghost btn-sm" to={`/registration/applications/${r.id}`}><FiEye size={13} /> Review</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {meta.last_page > 1 && (
          <div className="reg-pager">
            <button className="btn btn-ghost btn-sm" disabled={meta.current_page <= 1} onClick={() => setFilter('page', String(meta.current_page - 1))}>Previous</button>
            <span style={{ fontSize: '0.82rem' }}>Page {meta.current_page} of {meta.last_page}</span>
            <button className="btn btn-ghost btn-sm" disabled={meta.current_page >= meta.last_page} onClick={() => setFilter('page', String(meta.current_page + 1))}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
