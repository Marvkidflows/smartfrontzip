import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import RankBadge from '../../../components/RankBadge';
import { rankService, apiError } from '../../../services/rankService';
import { ACTION_LABELS, CHANGE_LABELS, describeRule, fmtDate } from './rankUtils';


export default function RankAuditTab() {
  const [sp, setSp] = useSearchParams();
  const kind = sp.get('kind') === 'criteria' ? 'criteria' : 'rank';
  const [filters, setFilters] = useState({
    investor: sp.get('investor') || '', rank_id: sp.get('rank_id') || '', change_type: '', actor: '', automatic: '',
    action: '', from: '', to: '', run_id: sp.get('run_id') || '',
  });
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [actors, setActors] = useState([]);
  const [schema, setSchema] = useState(null);
  const [rankOptions, setRankOptions] = useState([]);   // from the backend — never hardcoded ids
  const [loading, setLoading] = useState(true);
  const [openRow, setOpenRow] = useState({});

  useEffect(() => { rankService.criteriaSchema().then((r) => setSchema(r.data)).catch(() => {}); }, []);
  useEffect(() => { rankService.overview().then((r) => setRankOptions(r.data.ranks)).catch(() => {}); }, []);
  useEffect(() => { setPage(1); setOpenRow({}); }, [kind]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
    const req = kind === 'rank'
      ? rankService.audit({ ...clean, page })
      : rankService.criteriaHistory({ rank_id: clean.rank_id, action: clean.action, from: clean.from, to: clean.to, actor_id: clean.actor, page });
    req.then((r) => { if (cancelled) return; setRows(r.data.data); setMeta(r.data.meta); if (r.data.actors) setActors(r.data.actors); })
      .catch((e) => toast.error(apiError(e, 'Could not load audit history.')))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [kind, filters, page]);

  const set = (k) => (e) => { setFilters({ ...filters, [k]: e.target.value }); setPage(1); };

  return (
    <div>
      <div className="rk-btn-row" style={{ marginBottom: 12 }}>
        <button className={`rk-btn ${kind === 'rank' ? 'rk-btn--primary' : ''}`} onClick={() => setSp({ kind: 'rank' })}>Rank changes</button>
        <button className={`rk-btn ${kind === 'criteria' ? 'rk-btn--primary' : ''}`} onClick={() => setSp({ kind: 'criteria' })}>Criteria changes</button>
      </div>
      <div className="rk-muted" style={{ marginBottom: 10 }}>The audit log is append-only: records cannot be edited or deleted from the application.</div>

      <div className="rk-toolbar">
        {kind === 'rank' && <input className="rk-input" aria-label="Investor" placeholder="Investor name, email or account ID" value={filters.investor} onChange={set('investor')} style={{ flex: '2 1 220px' }} />}
        <select className="rk-select" aria-label="Rank" value={filters.rank_id} onChange={set('rank_id')}><option value="">Any rank</option>{rankOptions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
        {kind === 'rank' ? (
          <>
            <select className="rk-select" aria-label="Event type" value={filters.change_type} onChange={set('change_type')}>
              <option value="">Any event</option>{Object.entries(CHANGE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select className="rk-select" aria-label="Actor" value={filters.actor} onChange={set('actor')}>
              <option value="">Any actor</option><option value="system">System (automatic)</option>
              {actors.map((a) => <option key={a.actor_id} value={a.actor_id}>{a.actor_name}</option>)}
            </select>
          </>
        ) : (
          <select className="rk-select" aria-label="Action" value={filters.action} onChange={set('action')}>
            <option value="">Any action</option>{Object.entries(ACTION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        )}
        <input className="rk-input" type="date" aria-label="From date" value={filters.from} onChange={set('from')} />
        <input className="rk-input" type="date" aria-label="To date" value={filters.to} onChange={set('to')} />
      </div>
      {filters.run_id && kind === 'rank' && (
        <div className="rk-banner rk-banner--info">Showing changes made by re-evaluation run #{filters.run_id}. <button className="rk-btn rk-btn--sm" onClick={() => setFilters({ ...filters, run_id: '' })}>Clear</button></div>
      )}

      <div className="rk-table-wrap">
        {kind === 'rank' ? (
          <table className="rk-table">
            <thead><tr><th>When</th><th>Investor</th><th>Change</th><th>Type</th><th>By</th><th>Reason</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="rk-muted">Loading…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={6} className="rk-muted">No records.</td></tr>}
              {!loading && rows.map((r) => (
                <tr key={r.id}>
                  <td className="rk-muted" style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.created_at)}</td>
                  <td><Link to={`/admin/ranks/investors/${r.investor_id}`}>{r.investor_name || 'Investor'}</Link><div className="rk-mono rk-muted">{r.account_id}</div></td>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.change_type === 'review_retained' ? <RankBadge rank={r.new_rank} size="sm" /> : (<><RankBadge rank={r.previous_rank} size="sm" /> → <RankBadge rank={r.new_rank} size="sm" /></>)}</td>
                  <td><span className={`rk-chip ${r.is_automatic ? 'rk-chip--auto' : 'rk-chip--manual'}`}>{r.is_automatic ? 'Automatic' : 'Manual'}</span><div className="rk-muted">{CHANGE_LABELS[r.change_type]}</div></td>
                  <td>{r.actor_name}<div className="rk-mono rk-muted">{r.reference}</div></td>
                  <td style={{ maxWidth: 360, overflowWrap: 'anywhere' }}>{r.reason}
                    {r.override_justification && <div className="rk-muted">Override: {r.override_justification}</div>}
                    {r.criteria_snapshot && (<><br /><button className="rk-btn rk-btn--sm" onClick={() => setOpenRow({ ...openRow, [r.id]: !openRow[r.id] })}>{openRow[r.id] ? 'Hide' : 'Criteria applied'}</button>
                      {openRow[r.id] && <pre className="rk-pre">{JSON.stringify(r.criteria_snapshot, null, 2)}</pre>}</>)}
                    {r.notification_status && r.notification_status !== 'sent' && <div className="rk-error">Admin alert: {r.notification_status}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="rk-table-wrap"><table className="rk-table">
            <thead><tr><th>When</th><th>Rank</th><th>Action</th><th>By</th><th>Before → after</th><th>Reason</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="rk-muted">Loading…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={6} className="rk-muted">No records.</td></tr>}
              {!loading && rows.map((h) => (
                <tr key={h.id}>
                  <td className="rk-muted" style={{ whiteSpace: 'nowrap' }}>{fmtDate(h.created_at)}</td>
                  <td><RankBadge rank={h.rank} size="sm" /><div className="rk-muted">v{h.version}</div></td>
                  <td><span className="rk-chip rk-chip--info">{ACTION_LABELS[h.action] || h.action}</span></td>
                  <td>{h.actor_name}</td>
                  <td style={{ maxWidth: 420, overflowWrap: 'anywhere', fontSize: '0.82rem' }}>
                    {h.previous && <div><span className="rk-muted">Before:</span> {describeRule(h.previous, schema)}{h.previous.is_active !== undefined && ` (${h.previous.is_active ? 'active' : 'inactive'})`}</div>}
                    {h.new && <div><span className="rk-muted">After:</span> {describeRule(h.new, schema)}{h.new.is_active !== undefined && ` (${h.new.is_active ? 'active' : 'inactive'})`}</div>}
                  </td>
                  <td style={{ overflowWrap: 'anywhere' }}>{h.reason || <span className="rk-muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
      <div className="rk-pager">
        <span className="rk-muted">{meta.total.toLocaleString()} record{meta.total === 1 ? '' : 's'}</span>
        <button className="rk-btn rk-btn--sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {meta.current_page} of {meta.last_page}</span>
        <button className="rk-btn rk-btn--sm" disabled={page >= meta.last_page} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}
