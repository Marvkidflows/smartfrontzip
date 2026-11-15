import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import RankBadge, { NameWithRank } from '../../../components/RankBadge';
import { rankService, apiError } from '../../../services/rankService';
import { fmtDate } from './rankUtils';

const RANK_FILTERS = [['', 'All ranks'], ['none', 'Unranked'], ['bronze', 'Bronze'], ['silver', 'Silver'],
  ['gold', 'Gold'], ['platinum', 'Platinum'], ['diamond', 'Diamond'], ['elite', 'Elite']];

export default function RankInvestorsTab() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [rank, setRank] = useState('');
  const [review, setReview] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => { const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    rankService.investors({ search: debounced || undefined, rank: rank || undefined, needs_review: review ? 1 : undefined, page })
      .then((r) => { if (!cancelled) { setRows(r.data.data); setMeta(r.data.meta); } })
      .catch((e) => toast.error(apiError(e, 'Could not load investors.')))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [debounced, rank, review, page]);

  return (
    <div>
      <div className="rk-toolbar">
        <button type="button" className="rk-btn rk-btn--sm" onClick={() => rankService.exportCsv('investors').catch((e) => toast.error(apiError(e, 'Export failed.')))}>Export rank records</button>
        <button type="button" className="rk-btn rk-btn--sm" onClick={() => rankService.exportCsv('history').catch((e) => toast.error(apiError(e, 'Export failed.')))}>Export history</button>
        <input className="rk-input" type="search" aria-label="Search investors" placeholder="Search name, email or account ID (e.g. INVSTR-00012)"
          value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: '2 1 260px' }} />
        <select className="rk-select" aria-label="Filter by rank" value={rank} onChange={(e) => { setRank(e.target.value); setPage(1); }}>
          {RANK_FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <label className="rk-check"><input type="checkbox" checked={review} onChange={(e) => { setReview(e.target.checked); setPage(1); }} /> Needs review</label>
      </div>

      <div className="rk-table-wrap">
        <table className="rk-table">
          <thead><tr><th>Investor</th><th>Account ID</th><th>Rank</th><th>Rank changed</th><th>Status</th><th /></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="rk-muted">Loading…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={6} className="rk-muted">No investors match.</td></tr>}
            {!loading && rows.map((r) => (
              <tr key={r.id}>
                <td className="rk-cell-name">
                  <NameWithRank name={r.name} rank={r.rank} showUnranked />
                  <div className="rk-muted" style={{ overflowWrap: 'anywhere' }}>{r.email}</div>
                </td>
                <td className="rk-mono">{r.account_id}</td>
                <td><RankBadge rank={r.rank} size="sm" />{r.rank_status && r.rank_status !== 'active' && <span className="rk-chip rk-chip--warn" style={{ marginLeft: 6 }}>{r.rank_status}</span>}</td>
                <td className="rk-muted">{fmtDate(r.rank_changed_at)}</td>
                <td>{r.needs_review ? <span className="rk-chip rk-chip--warn">Needs review</span> : <span className="rk-chip rk-chip--muted">{r.status}</span>}</td>
                <td><Link className="rk-btn rk-btn--sm" to={`/admin/ranks/investors/${r.id}`}>Manage</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rk-pager">
        <span className="rk-muted">{meta.total.toLocaleString()} investor{meta.total === 1 ? '' : 's'}</span>
        <button className="rk-btn rk-btn--sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {meta.current_page} of {meta.last_page}</span>
        <button className="rk-btn rk-btn--sm" disabled={page >= meta.last_page} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}
