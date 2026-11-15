// LOCATION: src/pages/registration/RegistrationActivity.jsx
// Task 2 — the secure activity record: every registration event, status change, reviewer action and communication (append-only on the server).
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { registrationService } from '../../services/api';
import { EVENT_LABELS, eventLabel, statusLabel, fmtDateTime } from '../../utils/registrationStatus';
import '../admin/AdminPages.css';
import './RegistrationPages.css';

export default function RegistrationActivity() {
  const [f, setF] = useState({ type: '', from: '', to: '', page: 1 });
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = Object.fromEntries(Object.entries({ ...f, per_page: 25 }).filter(([, v]) => v));
      const res = await registrationService.getActivity(params);
      setRows(res.data.data); setMeta(res.data.meta);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load the activity log.';
      setError(msg); toast.error(msg);
    } finally { setLoading(false); }
  }, [f]);

  useEffect(() => { load(); }, [load]);
  const set = (k, v) => setF(x => ({ ...x, [k]: v, page: k === 'page' ? v : 1 }));

  return (
    <div className="adm-page">
      <div className="adm-page-header"><div><h1>Activity Log</h1><p>Audit trail of registration activity and reviewer actions · {meta.total} entries</p></div></div>
      <div className="adm-card" style={{ marginBottom: '1rem' }}>
        <div className="reg-filters" style={{ marginBottom: 0 }}>
          <select className="form-control" value={f.type} onChange={e => set('type', e.target.value)} aria-label="Event type">
            <option value="">All event types</option>
            {Object.entries(EVENT_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <input type="date" className="form-control" value={f.from} onChange={e => set('from', e.target.value)} aria-label="From date" />
          <input type="date" className="form-control" value={f.to} onChange={e => set('to', e.target.value)} aria-label="To date" />
        </div>
      </div>
      <div className="adm-card">
        {error ? <div role="alert" style={{ color: 'var(--danger)' }}>{error} <button className="btn btn-ghost btn-sm" onClick={load}>Retry</button></div>
          : loading ? <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>Loading…</div>
          : rows.length === 0 ? <div className="adm-empty"><p>No activity matches these filters.</p></div> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>When</th><th>Event</th><th>Application</th><th>By</th><th>Detail</th></tr></thead>
                <tbody>
                  {rows.map(e => (
                    <tr key={e.id}>
                      <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{fmtDateTime(e.created_at)}</td>
                      <td>{eventLabel(e.type)}</td>
                      <td>{e.application_id ? <Link to={`/registration/applications/${e.application_id}`}>#{e.application_id}</Link> : '—'}</td>
                      <td style={{ fontSize: '0.82rem' }}>{e.actor ? e.actor.name : 'Applicant / system'}</td>
                      <td style={{ fontSize: '0.82rem' }}>
                        {e.from_status || e.to_status ? `${e.from_status ? statusLabel(e.from_status) : ''}${e.from_status ? ' → ' : ''}${statusLabel(e.to_status)}` : ''}
                        {e.note ? <div style={{ whiteSpace: 'pre-wrap' }}>{e.note}</div> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        {meta.last_page > 1 && (
          <div className="reg-pager">
            <button className="btn btn-ghost btn-sm" disabled={meta.current_page <= 1} onClick={() => set('page', meta.current_page - 1)}>Previous</button>
            <span style={{ fontSize: '0.82rem' }}>Page {meta.current_page} of {meta.last_page}</span>
            <button className="btn btn-ghost btn-sm" disabled={meta.current_page >= meta.last_page} onClick={() => set('page', meta.current_page + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
