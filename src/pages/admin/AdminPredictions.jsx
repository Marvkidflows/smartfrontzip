// LOCATION: src/pages/admin/AdminPredictions.jsx
//
// Phase 4 — admin side. See backend AdminPredictionController's header
// comment for full scope notes (non-wagering, points only).

import { useState, useEffect } from 'react';
import { FiPlus, FiX, FiCheck, FiSlash, FiTarget } from 'react-icons/fi';
import { adminPredictionService } from '../../services/api';
import toast from 'react-hot-toast';
import './AdminPages.css';

const STATUS_COLORS = {
  draft: 'var(--gray-400)', open: 'var(--success)', closed: 'var(--warning)',
  resolved: 'var(--royal)', cancelled: '#e05252',
};

function CreateRoundModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    asset_symbol: '', question: '', closes_at: '', points_stake: 10, points_payout: 20,
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminPredictionService.create(form);
      toast.success('Prediction round created.');
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create round.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <form className="adm-modal" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <h3>New Prediction Round</h3>
        <div className="form-group">
          <label className="form-label">Asset Symbol</label>
          <input className="form-control" required placeholder="BTC" value={form.asset_symbol}
            onChange={e => setForm(f => ({ ...f, asset_symbol: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Question</label>
          <input className="form-control" required placeholder="Will BTC be up in the next hour?" value={form.question}
            onChange={e => setForm(f => ({ ...f, question: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Closes At</label>
          <input type="datetime-local" className="form-control" required value={form.closes_at}
            onChange={e => setForm(f => ({ ...f, closes_at: e.target.value }))} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Points Stake</label>
            <input type="number" min="1" className="form-control" required value={form.points_stake}
              onChange={e => setForm(f => ({ ...f, points_stake: Number(e.target.value) }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Points Payout (win)</label>
            <input type="number" min="1" className="form-control" required value={form.points_payout}
              onChange={e => setForm(f => ({ ...f, points_payout: Number(e.target.value) }))} />
          </div>
        </div>
        <div className="adm-modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create Round'}</button>
        </div>
      </form>
    </div>
  );
}

function ResolveModal({ round, onClose, onResolved }) {
  const [outcome, setOutcome] = useState('up');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminPredictionService.resolve(round.id, {
        outcome, resolution_price: price || undefined,
      });
      toast.success('Round resolved and entries settled.');
      onResolved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resolve round.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <form className="adm-modal" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <h3>Resolve: {round.question}</h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--gray-400)', marginBottom: '1rem' }}>
          Record the real outcome. Every entry ({round.entries_count ?? 0}) will be settled immediately — this cannot be undone.
        </p>
        <div className="form-group">
          <label className="form-label">Actual Outcome</label>
          <select className="form-control" value={outcome} onChange={e => setOutcome(e.target.value)}>
            <option value="up">Up</option>
            <option value="down">Down</option>
            <option value="flat">Flat / Unchanged</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Resolution Price (optional, for the record)</label>
          <input className="form-control" placeholder="e.g. 64250.10" value={price} onChange={e => setPrice(e.target.value)} />
        </div>
        <div className="adm-modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Resolving…' : 'Resolve & Settle'}</button>
        </div>
      </form>
    </div>
  );
}

export default function AdminPredictions() {
  const [rounds, setRounds] = useState([]);
  const [status, setStatus] = useState('loading');
  const [showCreate, setShowCreate] = useState(false);
  const [resolving, setResolving] = useState(null);

  const load = () => {
    adminPredictionService.getRounds()
      .then(res => { setRounds(res.data.data || res.data.rounds || []); setStatus('ready'); })
      .catch(() => setStatus('error'));
  };

  useEffect(() => { load(); }, []);

  const act = async (fn, round, successMsg) => {
    try {
      await fn(round.id);
      toast.success(successMsg);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed.');
    }
  };

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div>
          <h1>Predictions</h1>
          <p>Points-based prediction rounds — no real money is involved anywhere in this module.</p>
        </div>
        <div className="adm-header-actions">
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}><FiPlus /> New Round</button>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card__header"><div className="adm-card__title">All Rounds</div></div>

        {status === 'loading' && <div className="adm-empty"><p>Loading…</p></div>}
        {status === 'error' && <div className="adm-empty"><p>Couldn't load prediction rounds.</p></div>}

        {status === 'ready' && rounds.length === 0 && (
          <div className="adm-empty"><FiTarget size={28} /><p>No prediction rounds yet — create one to get started.</p></div>
        )}

        {status === 'ready' && rounds.map(r => (
          <div key={r.id} className="msg-item" style={{ cursor: 'default' }}>
            <div className="msg-item__body" style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'space-between' }}>
              <div>
                <div className="msg-item__subject">{r.asset_symbol} — {r.question}</div>
                <small style={{ color: 'var(--gray-400)' }}>
                  {r.entries_count ?? 0} entries · closes {new Date(r.closes_at).toLocaleString()}
                </small>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                  color: STATUS_COLORS[r.status], padding: '0.2rem 0.6rem',
                  border: `1px solid ${STATUS_COLORS[r.status]}`, borderRadius: 'var(--radius-pill)',
                }}>{r.status}</span>

                {r.status === 'open' && (
                  <button className="btn btn-sm btn-outline" onClick={() => act(adminPredictionService.close, r, 'Round closed.')}>Close</button>
                )}
                {['open', 'closed'].includes(r.status) && (
                  <button className="btn btn-sm btn-primary" onClick={() => setResolving(r)}><FiCheck /> Resolve</button>
                )}
                {!['resolved', 'cancelled'].includes(r.status) && (
                  <button className="btn btn-sm btn-warning-outline" onClick={() => act(adminPredictionService.cancel, r, 'Round cancelled.')}><FiSlash /></button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showCreate && <CreateRoundModal onClose={() => setShowCreate(false)} onCreated={load} />}
      {resolving && <ResolveModal round={resolving} onClose={() => setResolving(null)} onResolved={load} />}
    </div>
  );
}
