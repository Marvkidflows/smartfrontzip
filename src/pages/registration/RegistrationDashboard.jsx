// LOCATION: src/pages/registration/RegistrationDashboard.jsx
// Task 2 — registration monitoring: funnel counts, current status summary, date-range reporting, recent activity. Real API data only.
import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { registrationService } from '../../services/api';
import { STATUS_ORDER, statusBadge, statusLabel, eventLabel, fmtDateTime } from '../../utils/registrationStatus';
import '../admin/AdminPages.css';
import './RegistrationPages.css';

const isoDay = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return isoDay(d); };

export default function RegistrationDashboard() {
  const nav = useNavigate();
  const [range, setRange] = useState({ from: daysAgo(29), to: isoDay(new Date()) });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await registrationService.getDashboard(range);
      setData(res.data);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.to?.[0] || 'Failed to load the dashboard.';
      setError(msg); toast.error(msg);
    } finally { setLoading(false); }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const preset = (n) => setRange({ from: daysAgo(n), to: isoDay(new Date()) });
  const maxDaily = data ? Math.max(1, ...data.daily.map(d => Math.max(d.started, d.submitted))) : 1;
  const p = data?.period;

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div><h1>Registration Dashboard</h1><p>Monitor registrations, applications and KYC review</p></div>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}><FiRefreshCw size={14} /> Refresh</button>
      </div>

      <div className="adm-card" style={{ marginBottom: '1rem' }}>
        <div className="reg-filters" style={{ marginBottom: 0 }}>
          <label>From <input type="date" className="form-control" value={range.from} max={range.to} onChange={e => setRange(r => ({ ...r, from: e.target.value }))} /></label>
          <label>To <input type="date" className="form-control" value={range.to} min={range.from} onChange={e => setRange(r => ({ ...r, to: e.target.value }))} /></label>
          <div className="reg-actions" style={{ alignSelf: 'end' }}>
            {[[6, '7 days'], [29, '30 days'], [89, '90 days']].map(([n, l]) => (
              <button key={n} type="button" className="btn btn-ghost btn-sm" onClick={() => preset(n)}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="reg-note" role="alert" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{error}</div>}
      {loading && !data && <div className="adm-card" style={{ textAlign: 'center', color: 'var(--gray-400)' }}>Loading…</div>}

      {data && (
        <>
          {!data.visit_tracking_enabled && (
            <div className="reg-note">
              Page-visit tracking is switched off (it needs management approval of the privacy notice), so “Visitors” stays at zero.
              Registration attempts and applications are still tracked.
            </div>
          )}

          <h3 className="adm-card__title">Registration funnel — {data.range.from} to {data.range.to}</h3>
          <div className="reg-kpis">
            {[
              ['Visitors (consented)', p.visitors], ['Attempts', p.attempts], ['Applications started', p.applications_started],
              ['Registration completed', p.registration_completed], ['Submitted', p.submitted], ['Approved', p.approved], ['Rejected', p.rejected],
            ].map(([l, v]) => <div className="reg-kpi" key={l}><b>{v}</b><span>{l}</span></div>)}
          </div>

          <h3 className="adm-card__title">Current queue</h3>
          <div className="reg-kpis">
            {STATUS_ORDER.map(s => (
              <button key={s} type="button" className="reg-kpi reg-kpi--click" onClick={() => nav(`/registration/applications?status=${s}`)}>
                <b>{data.current.statuses[s].count}</b><span>{statusLabel(s)}</span>
              </button>
            ))}
            <button type="button" className="reg-kpi reg-kpi--click" onClick={() => nav('/registration/applications?overdue=1')}>
              <b>{data.current.incomplete_overdue}</b><span>Incomplete — follow up</span>
            </button>
            <div className="reg-kpi"><b>{data.current.unassigned_in_queue}</b><span>Unassigned in queue</span></div>
          </div>

          <div className="adm-card" style={{ marginBottom: '1rem' }}>
            <h3 className="adm-card__title">Daily activity <small style={{ fontWeight: 400 }}>(blue = started, gold = submitted)</small></h3>
            <div className="reg-bars" role="img" aria-label="Daily applications started and submitted">
              {data.daily.map(d => (
                <div className="reg-bar" key={d.date} title={`${d.date}: ${d.started} started, ${d.submitted} submitted, ${d.approved} approved, ${d.rejected} rejected`}>
                  <i className="sub" style={{ height: `${(d.submitted / maxDaily) * 100}%` }} />
                  <i style={{ height: `${(d.started / maxDaily) * 100}%` }} />
                </div>
              ))}
            </div>
          </div>

          <div className="adm-card">
            <h3 className="adm-card__title">Recent activity <Link to="/registration/activity" style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}>View all</Link></h3>
            {data.recent_activity.length === 0 ? <div className="adm-empty"><p>No activity yet.</p></div> : (
              <ul className="reg-timeline">
                {data.recent_activity.map(e => (
                  <li key={e.id}>
                    <strong>{eventLabel(e.type)}</strong>
                    {e.to_status && <> → <span className={statusBadge(e.to_status)}>{statusLabel(e.to_status)}</span></>}
                    {e.application_id && <> · <Link to={`/registration/applications/${e.application_id}`}>Application #{e.application_id}</Link></>}
                    <small>{fmtDateTime(e.created_at)}{e.actor ? ` · ${e.actor.name}` : ''}</small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
