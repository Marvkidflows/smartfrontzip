// LOCATION: src/pages/admin/AdminFixtures.jsx
//
// Gaming & Prediction — admin side. See AdminFixtureController's header
// comment for full scope notes (points only, top leagues only, exactly
// four market types). This revision adds: an overview dashboard, an
// automatic-sync status panel with manual "Sync Now", fixture filters/
// search, inline editing, postpone/reinstate, and bulk publish — all on
// top of the existing manual/API/competitions review workflow.

import { useState, useEffect, useCallback } from 'react';
import {
  FiPlus, FiCheck, FiSlash, FiTarget, FiTrash2, FiRefreshCw, FiGlobe,
  FiEdit2, FiPauseCircle, FiPlayCircle, FiCalendar, FiClock, FiUsers,
  FiEye, FiActivity, FiFlag,
} from 'react-icons/fi';
import { adminFixtureService, adminCompetitionService } from '../../services/api';
import toast from 'react-hot-toast';
import './AdminPages.css';

const MARKET_LABELS = { one_x_two: '1X2', double_chance: 'Double Chance', over_under: 'Over/Under', handicap: 'Handicap' };
const MARKET_TYPES = Object.keys(MARKET_LABELS);
const NEEDS_LINE = ['over_under', 'handicap'];
const STATUS_LABELS = { scheduled: 'Scheduled', live: 'Live', postponed: 'Postponed', finished: 'Completed', cancelled: 'Cancelled' };

function StatCard({ icon: Icon, label, value, color, gradient }) {
  return (
    <div className="adm-stat-card" style={{ '--gradient': gradient || `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)` }}>
      <div className="adm-stat-card__icon"><Icon size={20} /></div>
      <div className="adm-stat-card__body">
        <div className="adm-stat-card__label">{label}</div>
        <div className="adm-stat-card__value">{value ?? '—'}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status, isPublished }) {
  if (!isPublished) return <span className="fx-badge fx-badge--pending">Pending review</span>;
  const cls = {
    scheduled: 'fx-badge--scheduled', live: 'fx-badge--live', postponed: 'fx-badge--postponed',
    finished: 'fx-badge--finished', cancelled: 'fx-badge--cancelled',
  }[status] || '';
  return <span className={`fx-badge ${cls}`}>{STATUS_LABELS[status] || status}</span>;
}

// ── Overview cards ─────────────────────────────────────────────────

function OverviewSection() {
  const [data, setData] = useState(null);

  useEffect(() => {
    adminFixtureService.getOverview().then(res => setData(res.data)).catch(() => {});
  }, []);

  const c = data?.counts || {};

  return (
    <div className="adm-stats-grid fx-overview-grid">
      <StatCard icon={FiCalendar}  label="Upcoming"       value={c.upcoming}       color="#1A3A8F" />
      <StatCard icon={FiEye}       label="Pending Review" value={c.pending_review} color="#F59E0B" />
      <StatCard icon={FiCheck}     label="Published"      value={c.published}      color="#10B981" />
      <StatCard icon={FiActivity}  label="Live"           value={c.live}           color="#EF4444" />
      <StatCard icon={FiFlag}      label="Completed"      value={c.completed}      color="#3B82F6" />
      <StatCard icon={FiUsers}     label="Predictions"    value={c.predictions}    color="#8B5CF6" />
    </div>
  );
}

// ── Sync status panel ───────────────────────────────────────────────

function SyncPanel({ onSynced }) {
  const [status, setStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(() => {
    adminFixtureService.getSyncStatus().then(res => setStatus(res.data)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const syncNow = async () => {
    setSyncing(true);
    try {
      const res = await adminFixtureService.fetchFromApi();
      toast.success(res.data.message);
      if (res.data.warning) toast.error(res.data.warning);
      load();
      onSynced?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  if (!status) return null;

  const last = status.last_sync;
  const nextSync = last?.finished_at
    ? new Date(new Date(last.finished_at).getTime() + status.sync_interval_minutes * 60000)
    : null;

  return (
    <div className="adm-card fx-sync-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="fx-sync-panel__grid">
          <div>
            <div className="fx-sync-panel__label">Last Sync</div>
            <div className="fx-sync-panel__value">{last ? new Date(last.started_at).toLocaleString() : 'Never'}</div>
          </div>
          <div>
            <div className="fx-sync-panel__label">Sync Status</div>
            <div className="fx-sync-panel__value">
              {last ? (
                <span className={`fx-badge ${last.status === 'success' ? 'fx-badge--finished' : last.status === 'partial' ? 'fx-badge--postponed' : 'fx-badge--cancelled'}`}>
                  {last.status === 'success' ? 'Success' : last.status === 'partial' ? 'Partial' : 'Failed'}
                </span>
              ) : '—'}
            </div>
          </div>
          <div>
            <div className="fx-sync-panel__label">Next Scheduled Sync</div>
            <div className="fx-sync-panel__value">{nextSync ? nextSync.toLocaleString() : `Every ${status.sync_interval_minutes} min`}</div>
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={syncNow} disabled={syncing || status.sync_in_progress}>
          <FiRefreshCw className={syncing ? 'fx-spin' : ''} /> {syncing || status.sync_in_progress ? 'Syncing…' : 'Sync Now'}
        </button>
      </div>
      {!status.football_data_configured && (
        <div className="fx-api-warning" style={{ marginTop: '0.85rem', marginBottom: 0 }}>
          No football-data.org API key is configured yet. Add <code>FOOTBALL_DATA_API_KEY</code> to the backend <code>.env</code> —
          existing fixtures and manual entry keep working either way.
        </div>
      )}
      {last?.error && (
        <div className="fx-api-warning" style={{ marginTop: '0.85rem', marginBottom: 0 }}>{last.error}</div>
      )}
    </div>
  );
}

// ── Modals ───────────────────────────────────────────────────────────

function CreateFixtureModal({ leagues, onClose, onCreated }) {
  const [form, setForm] = useState({ league: leagues[0] || '', home_team: '', away_team: '', kickoff_at: '' });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminFixtureService.create(form);
      toast.success('Fixture created.');
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create fixture.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <form className="adm-modal" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <h3>New Fixture</h3>
        <div className="form-group">
          <label className="form-label">League</label>
          <select className="form-control" value={form.league} onChange={e => setForm(f => ({ ...f, league: e.target.value }))}>
            {leagues.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
          <div className="form-group">
            <label className="form-label">Home Team</label>
            <input className="form-control" required value={form.home_team} onChange={e => setForm(f => ({ ...f, home_team: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Away Team</label>
            <input className="form-control" required value={form.away_team} onChange={e => setForm(f => ({ ...f, away_team: e.target.value }))} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Kickoff</label>
          <input type="datetime-local" className="form-control" required value={form.kickoff_at} onChange={e => setForm(f => ({ ...f, kickoff_at: e.target.value }))} />
        </div>
        <div className="adm-modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create Fixture'}</button>
        </div>
      </form>
    </div>
  );
}

function EditFixtureModal({ fixture, leagues, onClose, onSaved }) {
  const toLocalInput = (iso) => {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [form, setForm] = useState({
    league: fixture.league, home_team: fixture.home_team, away_team: fixture.away_team,
    kickoff_at: toLocalInput(fixture.kickoff_at),
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminFixtureService.update(fixture.id, form);
      toast.success('Fixture updated.');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update fixture.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <form className="adm-modal" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <h3>Edit Fixture</h3>
        <p style={{ fontSize:'0.8rem', color:'var(--gray-400)', marginBottom:'0.75rem' }}>
          Source: <strong>{fixture.source === 'api' ? 'Football Data API' : 'Manual'}</strong>
          {fixture.provider_status && <> · Provider status: <strong>{fixture.provider_status}</strong></>}
        </p>
        <div className="form-group">
          <label className="form-label">League</label>
          <select className="form-control" value={form.league} onChange={e => setForm(f => ({ ...f, league: e.target.value }))}>
            {leagues.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
          <div className="form-group">
            <label className="form-label">Home Team</label>
            <input className="form-control" required value={form.home_team} onChange={e => setForm(f => ({ ...f, home_team: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Away Team</label>
            <input className="form-control" required value={form.away_team} onChange={e => setForm(f => ({ ...f, away_team: e.target.value }))} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Kickoff</label>
          <input type="datetime-local" className="form-control" required value={form.kickoff_at} onChange={e => setForm(f => ({ ...f, kickoff_at: e.target.value }))} />
        </div>
        <div className="adm-modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </form>
    </div>
  );
}

function AddMarketModal({ fixture, onClose, onAdded }) {
  const existingTypes = fixture.markets.map(m => m.market_type);
  const available = MARKET_TYPES.filter(t => !existingTypes.includes(t));
  const [marketType, setMarketType] = useState(available[0] || '');
  const [line, setLine] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminFixtureService.addMarket(fixture.id, { market_type: marketType, line: line || undefined });
      toast.success('Market added.');
      onAdded();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add market.');
    } finally {
      setSaving(false);
    }
  };

  if (available.length === 0) {
    return (
      <div className="adm-modal-overlay" onClick={onClose}>
        <div className="adm-modal" onClick={e => e.stopPropagation()}>
          <h3>All Markets Added</h3>
          <p style={{ fontSize:'0.85rem', color:'var(--gray-500)' }}>This fixture already has all four allowed market types.</p>
          <div className="adm-modal-footer"><button className="btn btn-primary" onClick={onClose}>Close</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <form className="adm-modal" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <h3>Add Market — {fixture.home_team} vs {fixture.away_team}</h3>
        <div className="form-group">
          <label className="form-label">Market Type</label>
          <select className="form-control" value={marketType} onChange={e => setMarketType(e.target.value)}>
            {available.map(t => <option key={t} value={t}>{MARKET_LABELS[t]}</option>)}
          </select>
        </div>
        {NEEDS_LINE.includes(marketType) && (
          <div className="form-group">
            <label className="form-label">Line (must end in .5, e.g. 2.5 or -1.5)</label>
            <input type="number" step="0.5" className="form-control" required value={line} onChange={e => setLine(e.target.value)} />
          </div>
        )}
        <div className="adm-modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Adding…' : 'Add Market'}</button>
        </div>
      </form>
    </div>
  );
}

function PredictionsModal({ fixture, onClose }) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    adminFixtureService.getPredictions(fixture.id)
      .then(res => { setData(res.data); setStatus('ready'); })
      .catch(() => setStatus('error'));
  }, [fixture.id]);

  const totalCount = data?.markets.reduce((sum, m) => sum + m.predictions.length, 0) ?? 0;

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal fx-predictions-modal" onClick={e => e.stopPropagation()}>
        <h3>Predictions — {fixture.home_team} vs {fixture.away_team}</h3>

        {status === 'loading' && <p style={{ fontSize:'0.85rem', color:'var(--gray-400)' }}>Loading…</p>}
        {status === 'error' && <p style={{ fontSize:'0.85rem', color:'var(--gray-400)' }}>Couldn't load predictions.</p>}

        {status === 'ready' && totalCount === 0 && (
          <p style={{ fontSize:'0.85rem', color:'var(--gray-400)' }}>No predictions submitted on this fixture yet.</p>
        )}

        {status === 'ready' && data.markets.filter(m => m.predictions.length > 0).map(m => (
          <div key={m.id} className="fx-predictions-market">
            <div className="fx-predictions-market__header">
              {MARKET_LABELS[m.market_type]}{m.line ? ` (${m.line})` : ''}
              <span style={{ color:'var(--gray-400)', fontWeight: 500 }}> · {m.predictions.length} pick(s)</span>
            </div>
            {m.predictions.map(p => (
              <div key={p.id} className="fx-predictions-row">
                <div>
                  <div className="fx-predictions-row__name">{p.user_name}</div>
                  <small style={{ color:'var(--gray-400)' }}>{p.user_email}</small>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div className="fx-predictions-row__selection">{p.selection.replace(/_/g, ' ')}</div>
                  <small style={{ color:'var(--gray-400)' }}>{new Date(p.submitted_at).toLocaleString()}</small>
                </div>
                {p.is_correct !== null && (
                  <span className={`fx-badge ${p.is_correct ? 'fx-badge--finished' : 'fx-badge--cancelled'}`}>
                    {p.is_correct ? `+${p.points_awarded} pts` : 'Incorrect'}
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}

        <div className="adm-modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function ResolveModal({ fixture, onClose, onResolved }) {
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminFixtureService.resolve(fixture.id, { home_score: homeScore, away_score: awayScore });
      toast.success('Fixture resolved and all predictions settled.');
      onResolved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resolve fixture.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <form className="adm-modal" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <h3>Resolve: {fixture.home_team} vs {fixture.away_team}</h3>
        <p style={{ fontSize:'0.82rem', color:'var(--gray-400)', marginBottom:'1rem' }}>
          Enter the real final score. All {fixture.markets_count ?? fixture.markets?.length ?? 0} market(s) and every prediction on them settle immediately — this cannot be undone.
          If automatic sync is enabled, this normally happens on its own once the provider reports a final score.
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:'0.75rem', alignItems:'end' }}>
          <div className="form-group">
            <label className="form-label">{fixture.home_team}</label>
            <input type="number" min="0" className="form-control" required value={homeScore} onChange={e => setHomeScore(e.target.value)} />
          </div>
          <div style={{ paddingBottom:'0.6rem', fontWeight:700, color:'var(--gray-400)' }}>–</div>
          <div className="form-group">
            <label className="form-label">{fixture.away_team}</label>
            <input type="number" min="0" className="form-control" required value={awayScore} onChange={e => setAwayScore(e.target.value)} />
          </div>
        </div>
        <div className="adm-modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Resolving…' : 'Resolve & Settle'}</button>
        </div>
      </form>
    </div>
  );
}

function CompetitionsPanel() {
  const [competitions, setCompetitions] = useState([]);
  const [configured, setConfigured] = useState(true);
  const [status, setStatus] = useState('loading');
  const [togglingId, setTogglingId] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const load = () => {
    setStatus('loading');
    adminCompetitionService.getCompetitions()
      .then(res => {
        setCompetitions(res.data.competitions || []);
        setConfigured(res.data.football_data_configured !== false);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  };

  useEffect(() => { load(); }, []);

  const toggle = async (competition) => {
    setTogglingId(competition.id);
    try {
      const res = await adminCompetitionService.toggle(competition.id, !competition.is_enabled);
      toast.success(res.data.message);
      setCompetitions(cs => cs.map(c => c.id === competition.id ? res.data.competition : c));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update competition.');
    } finally {
      setTogglingId(null);
    }
  };

  const syncFromProvider = async () => {
    setSyncing(true);
    try {
      const res = await adminCompetitionService.syncFromProvider();
      toast.success(res.data.message);
      setCompetitions(res.data.competitions || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to sync competitions from provider.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="adm-card">
      <div className="adm-card__header">
        <div className="adm-card__title">Available Competitions</div>
        <button className="btn btn-sm btn-outline" onClick={syncFromProvider} disabled={syncing || !configured}>
          <FiRefreshCw className={syncing ? 'fx-spin' : ''} /> {syncing ? 'Syncing…' : 'Sync From Provider'}
        </button>
      </div>

      {!configured && (
        <div className="fx-api-warning">
          No football-data.org API key is configured yet. You can still enable/disable competitions here —
          they'll take effect as soon as <code>FOOTBALL_DATA_API_KEY</code> is added to the backend <code>.env</code>.
        </div>
      )}

      <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginBottom: '1rem' }}>
        Enabled competitions are included in every automatic sync (scheduled or "Sync Now").
        Disabling a competition only affects future fetches — fixtures already imported or published are untouched.
        "Sync From Provider" refreshes this list from football-data.org itself rather than a fixed set.
      </p>

      {status === 'loading' && <div className="adm-empty"><p>Loading…</p></div>}
      {status === 'error' && <div className="adm-empty"><p>Couldn't load competitions.</p></div>}

      {status === 'ready' && competitions.map(c => (
        <div key={c.id} className="fx-competition-row">
          <div>
            <div className="fx-competition-row__name">{c.name}</div>
            <small style={{ color: 'var(--gray-400)' }}>{c.provider_code}</small>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={c.is_enabled}
            className={`fx-toggle ${c.is_enabled ? 'fx-toggle--on' : ''}`}
            disabled={togglingId === c.id}
            onClick={() => toggle(c)}
          >
            <span className="fx-toggle__thumb" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Filters bar ──────────────────────────────────────────────────────

function FiltersBar({ leagues, filters, setFilters }) {
  return (
    <div className="fx-filters">
      <input
        className="form-control fx-filters__search"
        placeholder="Search team…"
        value={filters.search}
        onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
      />
      <select className="form-control" value={filters.league} onChange={e => setFilters(f => ({ ...f, league: e.target.value }))}>
        <option value="">All competitions</option>
        {leagues.map(l => <option key={l} value={l}>{l}</option>)}
      </select>
      <select className="form-control" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
        <option value="">All statuses</option>
        {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <select className="form-control" value={filters.published} onChange={e => setFilters(f => ({ ...f, published: e.target.value }))}>
        <option value="">Published & unpublished</option>
        <option value="1">Published only</option>
        <option value="0">Unpublished only</option>
      </select>
      <input type="date" className="form-control" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} title="From date" />
      <input type="date" className="form-control" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} title="To date" />
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────

export default function AdminFixtures() {
  const [tab, setTab] = useState('manual'); // 'manual' | 'api' | 'competitions'
  const [fixtures, setFixtures] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [apiConfigured, setApiConfigured] = useState(true);
  const [status, setStatus] = useState('loading');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [addingMarketTo, setAddingMarketTo] = useState(null);
  const [resolving, setResolving] = useState(null);
  const [viewingPredictions, setViewingPredictions] = useState(null);
  const [selected, setSelected] = useState([]);
  const [filters, setFilters] = useState({ search: '', league: '', status: '', published: '', date_from: '', date_to: '' });

  const load = useCallback(() => {
    if (tab === 'competitions') return; // CompetitionsPanel loads its own data
    setStatus('loading');
    setSelected([]);
    adminFixtureService.getFixtures({ source: tab, ...filters })
      .then(res => {
        setFixtures(res.data.fixtures?.data || res.data.fixtures || []);
        setLeagues(res.data.leagues || []);
        setApiConfigured(res.data.football_data_configured !== false);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [tab, filters]);

  useEffect(() => { load(); }, [load]);

  const publishFixture = async (fixtureId) => {
    try {
      await adminFixtureService.publish(fixtureId);
      toast.success('Fixture published — now visible to investors.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish fixture.');
    }
  };

  const bulkPublish = async () => {
    try {
      const res = await adminFixtureService.bulkPublish(selected);
      toast.success(res.data.message);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish selected fixtures.');
    }
  };

  const discardFixture = async (fixtureId) => {
    try {
      await adminFixtureService.discard(fixtureId);
      toast.success('Fixture discarded.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to discard fixture.');
    }
  };

  const removeMarket = async (fixtureId, marketId) => {
    try {
      await adminFixtureService.removeMarket(fixtureId, marketId);
      toast.success('Market removed.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove market.');
    }
  };

  const cancelFixture = async (fixtureId) => {
    try {
      await adminFixtureService.cancel(fixtureId);
      toast.success('Fixture cancelled.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel fixture.');
    }
  };

  const postponeFixture = async (fixtureId) => {
    try {
      await adminFixtureService.postpone(fixtureId);
      toast.success('Fixture marked as postponed.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to postpone fixture.');
    }
  };

  const reinstateFixture = async (fixtureId) => {
    try {
      await adminFixtureService.reinstate(fixtureId);
      toast.success('Fixture reinstated as scheduled.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reinstate fixture.');
    }
  };

  const toggleSelect = (id) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  const pendingIds = fixtures.filter(f => !f.is_published).map(f => f.id);

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div>
          <h1>Gaming & Prediction</h1>
          <p>Fixtures from top leagues only. Points-based — no investment or real money is involved.</p>
        </div>
        <div className="adm-header-actions">
          {tab === 'manual' && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}><FiPlus /> New Fixture</button>
          )}
          {tab === 'api' && selected.length > 0 && (
            <button className="btn btn-primary" onClick={bulkPublish}><FiCheck /> Publish {selected.length} Selected</button>
          )}
        </div>
      </div>

      <OverviewSection />
      <SyncPanel onSynced={load} />

      {/* Fixture source selection — manual entry always available as a
          fallback regardless of API configuration/availability. */}
      <div className="fx-source-tabs">
        <button className={`fx-source-tab ${tab === 'manual' ? 'active' : ''}`} onClick={() => setTab('manual')}>
          Manual
        </button>
        <button className={`fx-source-tab ${tab === 'api' ? 'active' : ''}`} onClick={() => setTab('api')}>
          Football Data API
        </button>
        <button className={`fx-source-tab ${tab === 'competitions' ? 'active' : ''}`} onClick={() => setTab('competitions')}>
          <FiGlobe size={13} style={{ marginRight: '0.3rem', verticalAlign: '-2px' }} /> Competitions
        </button>
      </div>

      {tab === 'api' && !apiConfigured && (
        <div className="fx-api-warning">
          No football-data.org API key is configured yet. Add <code>FOOTBALL_DATA_API_KEY</code> to
          the backend <code>.env</code> to enable automatic fetching — manual fixture entry keeps working either way.
        </div>
      )}

      {tab === 'competitions' && <CompetitionsPanel />}

      {tab !== 'competitions' && (
      <div className="adm-card">
        <div className="adm-card__header">
          <div className="adm-card__title">{tab === 'manual' ? 'Manually Created Fixtures' : 'Fixtures from Football Data API'}</div>
        </div>

        <FiltersBar leagues={leagues} filters={filters} setFilters={setFilters} />

        {tab === 'api' && pendingIds.length > 0 && (
          <label className="fx-select-all">
            <input
              type="checkbox"
              checked={selected.length === pendingIds.length}
              onChange={e => setSelected(e.target.checked ? pendingIds : [])}
            />
            Select all pending review ({pendingIds.length})
          </label>
        )}

        {status === 'loading' && <div className="adm-empty"><p>Loading…</p></div>}
        {status === 'error' && <div className="adm-empty"><p>Couldn't load fixtures.</p></div>}
        {status === 'ready' && fixtures.length === 0 && tab === 'manual' && (
          <div className="adm-empty"><FiTarget size={28} /><p>No manual fixtures match these filters.</p></div>
        )}
        {status === 'ready' && fixtures.length === 0 && tab === 'api' && (
          <div className="adm-empty"><FiTarget size={28} /><p>No API fixtures match these filters — enable competitions on the Competitions tab, then click "Sync Now" above to pull upcoming matches for review.</p></div>
        )}

        {status === 'ready' && fixtures.map(f => (
          <div key={f.id} className="fx-fixture-row">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'0.75rem' }}>
              <div style={{ display:'flex', gap:'0.6rem', alignItems:'flex-start' }}>
                {tab === 'api' && !f.is_published && (
                  <input type="checkbox" style={{ marginTop:'0.3rem' }} checked={selected.includes(f.id)} onChange={() => toggleSelect(f.id)} />
                )}
                <div>
                  <div className="fx-fixture-row__title">
                    {f.league} — {f.home_team} vs {f.away_team}
                  </div>
                  <small style={{ color:'var(--gray-400)', display:'flex', gap:'0.5rem', alignItems:'center', flexWrap:'wrap', marginTop:'0.2rem' }}>
                    <FiClock size={11} />
                    {f.status === 'finished' ? `Final: ${f.home_score}–${f.away_score}` : new Date(f.kickoff_at).toLocaleString()}
                    <StatusBadge status={f.status} isPublished={f.is_published} />
                    {f.predictions_count > 0 && (
                      <span className="fx-badge" style={{ background:'rgba(139,92,246,0.14)', color:'#7C3AED' }}>
                        <FiUsers size={10} style={{ marginRight:'0.25rem' }} /> {f.predictions_count} prediction{f.predictions_count === 1 ? '' : 's'}
                      </span>
                    )}
                    {f.last_synced_at && <span style={{ opacity:0.7 }}>· synced {new Date(f.last_synced_at).toLocaleTimeString()}</span>}
                  </small>
                </div>
              </div>
              <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                {f.is_published && f.predictions_count > 0 && (
                  <button className="btn btn-sm btn-outline" onClick={() => setViewingPredictions(f)}><FiUsers /> Predictions</button>
                )}
                {!f.is_published ? (
                  <>
                    <button className="btn btn-sm btn-outline" onClick={() => setEditing(f)}><FiEdit2 /></button>
                    <button className="btn btn-sm btn-primary" onClick={() => publishFixture(f.id)}><FiCheck /> Publish</button>
                    <button className="btn btn-sm btn-warning-outline" onClick={() => discardFixture(f.id)}><FiTrash2 /> Discard</button>
                  </>
                ) : f.status === 'scheduled' ? (
                  <>
                    <button className="btn btn-sm btn-outline" onClick={() => setEditing(f)}><FiEdit2 /></button>
                    <button className="btn btn-sm btn-outline" onClick={() => setAddingMarketTo(f)}><FiPlus /> Market</button>
                    <button className="btn btn-sm btn-outline" onClick={() => postponeFixture(f.id)}><FiPauseCircle /></button>
                    <button className="btn btn-sm btn-primary" onClick={() => setResolving(f)}><FiCheck /> Resolve</button>
                    <button className="btn btn-sm btn-warning-outline" onClick={() => cancelFixture(f.id)}><FiSlash /></button>
                  </>
                ) : f.status === 'postponed' ? (
                  <>
                    <button className="btn btn-sm btn-outline" onClick={() => setEditing(f)}><FiEdit2 /> Set New Time</button>
                    <button className="btn btn-sm btn-primary" onClick={() => reinstateFixture(f.id)}><FiPlayCircle /> Reinstate</button>
                    <button className="btn btn-sm btn-warning-outline" onClick={() => cancelFixture(f.id)}><FiSlash /></button>
                  </>
                ) : null}
              </div>
            </div>
            {f.markets?.length > 0 && (
              <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap', marginTop:'0.6rem' }}>
                {f.markets.map(m => (
                  <span key={m.id} style={{
                    fontSize:'0.72rem', fontWeight:600, padding:'0.2rem 0.55rem', borderRadius:'var(--radius-pill)',
                    background:'var(--gray-100)', color:'var(--gray-600)', display:'flex', alignItems:'center', gap:'0.3rem',
                  }}>
                    {MARKET_LABELS[m.market_type]}{m.line ? ` (${m.line})` : ''}
                    {f.status === 'scheduled' && (
                      <FiTrash2 size={11} style={{ cursor:'pointer' }} onClick={() => removeMarket(f.id, m.id)} />
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      )}

      {showCreate && <CreateFixtureModal leagues={leagues} onClose={() => setShowCreate(false)} onCreated={load} />}
      {editing && <EditFixtureModal fixture={editing} leagues={leagues} onClose={() => setEditing(null)} onSaved={load} />}
      {addingMarketTo && <AddMarketModal fixture={addingMarketTo} onClose={() => setAddingMarketTo(null)} onAdded={load} />}
      {resolving && <ResolveModal fixture={resolving} onClose={() => setResolving(null)} onResolved={load} />}
      {viewingPredictions && <PredictionsModal fixture={viewingPredictions} onClose={() => setViewingPredictions(null)} />}
    </div>
  );
}
