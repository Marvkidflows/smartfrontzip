// LOCATION: src/pages/financial/FinancialInvestments.jsx
//
// Financial Team dashboard — read-only view of investment-related
// financial records. Deliberately built fresh rather than reusing
// AdminInvestments.jsx: that component renders "Manage Countdown" and
// "Complete Investment" actions the financial role is not meant to
// have (only index/show exist under /financial/*, no countdown or
// completion routes) — hiding those buttons here keeps the UI honest
// about what this role can do, on top of (not instead of) the backend
// actually blocking those endpoints for anyone without the admin role.
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiEdit3 } from 'react-icons/fi';
import { financialService } from '../../services/api';
import toast from 'react-hot-toast';
import { notifyAdjustmentResult, adjustmentErrorMessage } from '../../utils/approvalResponse';
import '../admin/AdminPages.css';
import { NameWithRank } from '../../components/RankBadge';
import './FinancialPages.css';

const STATUS_COLOR = { active: 'success', matured: 'info', completed: 'success', cancelled: 'danger' };

function QuickCorrectModal({ investment, onClose, onDone }) {
  const [amount, setAmount] = useState(investment.amount);
  const [roi, setRoi] = useState(investment.profit_percent ?? 0);
  const [reason, setReason] = useState('');
  const [authRef, setAuthRef] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (reason.trim().length < 10) { toast.error('Please provide a reason (at least 10 characters).'); return; }
    if (authRef.trim().length < 3) { toast.error('An authorization reference is required.'); return; }
    setSubmitting(true);
    try {
      const res = await financialService.correctInvestment(investment.id, { amount: parseFloat(amount), profit_percentage: parseFloat(roi), reason: reason.trim(), authorization_reference: authRef.trim() });
      notifyAdjustmentResult(toast, res, 'Investment record corrected.');   // 202: awaiting a second approver, record unchanged
      onDone();
    } catch (err) { toast.error(adjustmentErrorMessage(err, 'Correction failed.')); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <h3>Correct Investment #{investment.id}</h3>
        <form onSubmit={submit}>
          <div className="form-group"><label className="form-label">Amount ($)</label>
            <input type="number" min="0.01" step="0.01" className="form-control" value={amount} onChange={e => setAmount(e.target.value)} required /></div>
          <div className="form-group"><label className="form-label">ROI (%)</label>
            <input type="number" min="0" step="0.01" className="form-control" value={roi} onChange={e => setRoi(e.target.value)} required /></div>
          <div className="form-group"><label className="form-label">Reason</label>
            <textarea className="form-control" rows={3} required value={reason} onChange={e => setReason(e.target.value)} style={{ resize: 'vertical' }} /></div>
          <div className="form-group"><label className="form-label">Authorization reference</label>
            <input className="form-control" maxLength={255} required value={authRef} onChange={e => setAuthRef(e.target.value)} placeholder="case / ticket / approval number" /></div>
          <div className="adm-modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? <span className="spinner" /> : 'Submit for Approval'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FinancialInvestments() {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [correcting, setCorrecting] = useState(null);

  const load = () => {
    financialService.getInvestments()
      .then(res => setInvestments(res.data?.investments || []))
      .catch(() => toast.error('Failed to load investment records'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = filter === 'all' ? investments : investments.filter(i => i.status === filter);

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div>
          <h1>Investment Records</h1>
          <p>Read-only view of investor investment accounts for financial review</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {['all', 'active', 'matured', 'completed', 'cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
            style={{ textTransform: 'capitalize' }}>
            {f}
          </button>
        ))}
      </div>

      <div className="adm-card">
        <h3 className="adm-card__title">
          {filter === 'all' ? 'All Investments' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Investments`}
        </h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="adm-empty"><p>No {filter === 'all' ? '' : filter} investments found.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Investor</th><th>Plan</th><th>Amount</th><th>Expected Profit</th>
                  <th>Progress</th><th>Days Left</th><th>Status</th><th>Started</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(i => (
                  <tr key={i.id}>
                    <td>
                      <Link to={`/financial/investors/${i.user?.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        <strong><NameWithRank name={i.user?.name || '—'} rank={i.user?.rank} /></strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{i.user?.email}</div>
                      </Link>
                    </td>
                    <td>{i.plan?.name || '—'}</td>
                    <td><strong>${i.amount.toLocaleString()}</strong></td>
                    <td>${i.expected_profit.toLocaleString()}</td>
                    <td>
                      <div className="fin-progress-track">
                        <div className="fin-progress-fill" style={{ width: `${i.progress}%` }} />
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>{i.progress}%</span>
                    </td>
                    <td>{i.days_remaining}</td>
                    <td><span className={`badge badge-${STATUS_COLOR[i.status] || 'info'}`}>{i.status}</span></td>
                    <td style={{ fontSize: '0.82rem' }}>{i.start_date || '—'}</td>
                    <td>
                      {i.status === 'active' && !i.is_paid ? (
                        <button className="btn btn-ghost btn-sm" onClick={() => setCorrecting(i)}><FiEdit3 size={13} /> Correct</button>
                      ) : <span style={{ color: 'var(--gray-300)', fontSize: '0.78rem' }}>Locked</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {correcting && (
        <QuickCorrectModal investment={correcting} onClose={() => setCorrecting(null)} onDone={() => { setCorrecting(null); load(); }} />
      )}
    </div>
  );
}
