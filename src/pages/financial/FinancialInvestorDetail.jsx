// LOCATION: src/pages/financial/FinancialInvestorDetail.jsx
//
// Financial Team — investor detail + add/deduct balance. Adapted from
// AdminUserDetail.jsx, deliberately trimmed to ONLY add/deduct — no
// freeze/unfreeze/reset/suspend/activate here. Those are account-status
// powers that stay admin-only (the /financial/investors/{id}/balance
// route on the backend technically accepts them too since it's the same
// controller method as admin, but this UI only ever sends 'add'/'deduct'
// so financial staff can't reach those actions through this screen).
import { useState, useEffect } from 'react';
import { NameWithRank } from '../../components/RankBadge';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiMinus, FiClock, FiEdit3, FiMail, FiMessageSquare } from 'react-icons/fi';
import { financialService } from '../../services/api';
import toast from 'react-hot-toast';
import { notifyAdjustmentResult, adjustmentErrorMessage } from '../../utils/approvalResponse';
import '../admin/AdminPages.css';
import './FinancialPages.css';

// Authorized, audited correction of the investor's mailing/postal
// information. Requires a reason; the backend records before/after values,
// actor, and timestamp in the same audit trail as investment corrections.
function MailingAddressModal({ current, onClose, onSubmit, submitting }) {
  const [line1, setLine1] = useState(current.address_line_1 || '');
  const [line2, setLine2] = useState(current.address_line_2 || '');
  const [city, setCity] = useState(current.city || '');
  const [state, setState] = useState(current.state || '');
  const [postal, setPostal] = useState(current.postal_code || '');
  const [reason, setReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 10) { toast.error('Please provide a reason (at least 10 characters) for the audit log.'); return; }
    onSubmit({
      address_line_1: line1.trim(), address_line_2: line2.trim() || null,
      city: city.trim(), state: state.trim() || null, postal_code: postal.trim() || null,
      reason: reason.trim(),
    });
  };

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <h3>Correct Mailing / Postal Information</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Address Line 1</label>
            <input className="form-control" required value={line1} onChange={e => setLine1(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Address Line 2 <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>(optional)</span></label>
            <input className="form-control" value={line2} onChange={e => setLine2(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">City</label>
            <input className="form-control" required value={city} onChange={e => setCity(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">State / Province</label>
            <input className="form-control" value={state} onChange={e => setState(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Postal / ZIP Code</label>
            <input className="form-control" value={postal} onChange={e => setPostal(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Reason</label>
            <textarea className="form-control" rows={3} required placeholder="e.g. Investor reported a data entry error at registration."
              value={reason} onChange={e => setReason(e.target.value)} style={{ resize: 'vertical' }} />
            <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: '0.3rem' }}>
              This correction, and the previous values, are permanently recorded in the audit log.
            </div>
          </div>
          <div className="adm-modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <span className="spinner" /> : 'Apply Correction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
// from balance add/deduct above — this never moves wallet money, it fixes
// the record itself, and is always audited with before/after values.
function CorrectionModal({ investment, onClose, onSubmit, submitting }) {
  const [amount, setAmount] = useState(investment.amount);
  const [roi, setRoi] = useState(investment.profit_percent ?? investment.profit_percentage ?? 0);
  const [reason, setReason] = useState('');
  const [authRef, setAuthRef] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 10) { toast.error('Please provide a reason (at least 10 characters) for the audit log.'); return; }
    if (authRef.trim().length < 3) { toast.error('An authorization reference is required.'); return; }
    onSubmit({ amount: parseFloat(amount), profit_percentage: parseFloat(roi), reason: reason.trim(), authorization_reference: authRef.trim() });
  };

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <h3>Correct Investment Record #{investment.id}</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: '0.25rem' }}>
          Current: ${parseFloat(investment.amount).toLocaleString()} at {investment.profit_percent ?? investment.profit_percentage}% ROI
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Corrected Amount ($)</label>
            <input type="number" min="0.01" step="0.01" className="form-control" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Corrected ROI (%)</label>
            <input type="number" min="0" step="0.01" className="form-control" value={roi} onChange={e => setRoi(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Reason</label>
            <textarea className="form-control" rows={3} required placeholder="e.g. Correction requested after record review."
              value={reason} onChange={e => setReason(e.target.value)} style={{ resize: 'vertical' }} />
            <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: '0.3rem' }}>
              This correction, and the previous values, are permanently recorded in the audit log.
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Authorization reference</label>
            <input className="form-control" maxLength={255} required placeholder="e.g. case / ticket / approval number"
              value={authRef} onChange={e => setAuthRef(e.target.value)} />
            <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: '0.3rem' }}>
              Submitting does NOT change the record. A second authorised person must approve it in the Approvals inbox first.
            </div>
          </div>
          <div className="adm-modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <span className="spinner" /> : 'Submit Correction for Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const ADJUSTMENT_LABELS = {
  add:      { label: 'Added',     color: 'success' },
  deduct:   { label: 'Deducted',  color: 'danger'  },
  freeze:   { label: 'Frozen',    color: 'warning' },
  unfreeze: { label: 'Unfrozen',  color: 'info'    },
  reset:    { label: 'Reset',     color: 'danger'  },
};

function BalanceActionModal({ type, currentBalance, onClose, onSubmit, submitting }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const COPY = {
    add:    { title: 'Add to Balance',      cta: 'Add Funds',    icon: FiPlus,  color: 'var(--success)' },
    deduct: { title: 'Deduct from Balance', cta: 'Deduct Funds', icon: FiMinus, color: 'var(--danger)'  },
  }[type];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Enter a valid amount.');
      return;
    }
    if (!reason.trim()) {
      toast.error('A reason is required for the audit log.');
      return;
    }
    onSubmit({ type, amount: parseFloat(amount), reason: reason.trim() });
  };

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: '10px', background: `${COPY.color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COPY.color, flexShrink: 0 }}>
            <COPY.icon size={19} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 0 }}>{COPY.title}</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>Current balance: ${parseFloat(currentBalance || 0).toLocaleString()}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Amount ($)</label>
            <input
              type="number" min="0.01" step="0.01" className="form-control" required autoFocus
              placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Reason</label>
            <textarea
              className="form-control" rows={3} required
              placeholder={type === 'add' ? 'e.g. Manual profit credit for Q2 performance' : 'e.g. Service charge deduction'}
              value={reason} onChange={e => setReason(e.target.value)}
              style={{ resize: 'vertical' }}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: '0.3rem' }}>
              This note is permanently recorded in the audit log.
            </div>
          </div>
          <div className="adm-modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <span className="spinner" /> : COPY.cta}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FinancialInvestorDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState(null);
  const [correcting, setCorrecting] = useState(null); // investment being corrected
  const [correctingAddress, setCorrectingAddress] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchUser = () => {
    financialService.showInvestor(id)
      .then(res => setData(res.data))
      .catch(() => toast.error('Failed to load investor'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUser(); }, [id]);

  const handleBalanceAction = async (payload) => {
    setSubmitting(true);
    try {
      const res = await financialService.adjustBalance(id, payload);
      notifyAdjustmentResult(toast, res, 'Balance updated.');   // 202 = awaiting a second approver: nothing changed yet
      setActiveModal(null);
      fetchUser();
    } catch (err) {
      toast.error(adjustmentErrorMessage(err, 'Failed to apply adjustment.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCorrection = async (payload) => {
    setSubmitting(true);
    try {
      const res = await financialService.correctInvestment(correcting.id, payload);
      notifyAdjustmentResult(toast, res, 'Investment record corrected.');   // normally 202: applied only after a second approver
      setCorrecting(null);
      fetchUser();
    } catch (err) {
      toast.error(adjustmentErrorMessage(err, 'Correction failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleMailingCorrection = async (payload) => {
    setSubmitting(true);
    try {
      const res = await financialService.correctMailingAddress(id, payload);
      toast.success(res.data?.message || 'Mailing information corrected.');
      setCorrectingAddress(false);
      fetchUser();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Correction failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ textAlign:'center', padding:'3rem', color:'var(--gray-400)' }}>Loading…</div>;
  if (!data?.user) return <div style={{ textAlign:'center', padding:'3rem', color:'var(--danger)' }}>Investor not found</div>;

  const { user, investments = [], balance_history = [], deposits = [], withdrawals = [], audit_history = [], mailing_address = {} } = data;
  const isFrozen = user.status === 'frozen';

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
          <Link to="/financial/investors" className="btn btn-ghost btn-sm"><FiArrowLeft /> Back</Link>
          <div><h1><NameWithRank name={user.name} rank={user.rank} size="md" showUnranked /></h1><p>Investor Profile</p></div>
        </div>
        {/* Communicate with this investor without leaving their record.
            Both open the Mail page pre-targeted at this investor; every
            message / email is identified as the Financial Team and logged. */}
        <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
          <button className="btn btn-ghost btn-sm"
            onClick={() => navigate('/financial/messages', { state: { tab: 'inbox', openInvestor: user.id } })}>
            <FiMessageSquare size={14} /> Message
          </button>
          <button className="btn btn-primary btn-sm"
            onClick={() => navigate('/financial/messages', { state: { prefillInvestor: { id: user.id, name: user.name, email: user.email } } })}>
            <FiMail size={14} /> Send Email
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:'1.5rem', alignItems:'start' }}>
        <div className="adm-card" style={{ textAlign:'center' }}>
          <div className="profile-big-avatar" style={{ margin:'0 auto 1rem' }}>
            {(user.name||'?').charAt(0).toUpperCase()}
          </div>
          <h3><NameWithRank name={user.name} rank={user.rank} size="sm" showUnranked /></h3>
          <p style={{ color:'var(--gray-400)', fontSize:'0.85rem', marginBottom:'0.75rem' }}>{user.email}</p>
          <span className={`badge badge-${isFrozen ? 'warning' : user.status==='active' ? 'success' : 'danger'}`}>
            {isFrozen ? 'Frozen' : (user.status || 'active')}
          </span>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
          <div className="adm-card">
            <h3 className="adm-card__title">Account Information</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
              {[
                ['Full Name', user.name], ['Email', user.email], ['Phone', user.phone||'—'],
                ['Country', user.country||'—'], ['Balance', `$${parseFloat(user.balance||0).toLocaleString()}`],
                ['Total Invested', `$${parseFloat(user.total_invested||0).toLocaleString()}`],
                ['Total Profit', `$${parseFloat(user.total_profit||0).toLocaleString()}`],
                ['Member Since', user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'],
              ].map(([l,v]) => (
                <div key={l}>
                  <div style={{ fontSize:'0.72rem', color:'var(--gray-400)', marginBottom:'0.25rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>{l}</div>
                  <div style={{ fontSize:'0.9rem', fontWeight:600, color:'var(--gray-800)' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="adm-card">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem' }}>
              <h3 className="adm-card__title" style={{ marginBottom: 0 }}>Balance Management</h3>
              <span style={{ fontSize:'1.4rem', fontWeight:800, color:'var(--navy)' }}>
                ${parseFloat(user.balance||0).toLocaleString()}
              </span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'0.6rem', maxWidth: 280 }}>
              <button className="btn btn-success btn-sm" onClick={() => setActiveModal('add')}>
                <FiPlus size={14} /> Add
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => setActiveModal('deduct')}>
                <FiMinus size={14} /> Deduct
              </button>
            </div>

            <div style={{ marginTop:'1.5rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.75rem' }}>
                <FiClock size={14} style={{ color:'var(--gray-400)' }} />
                <span style={{ fontSize:'0.78rem', fontWeight:700, color:'var(--gray-500)', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                  Adjustment History
                </span>
              </div>
              {balance_history.length === 0 ? (
                <div style={{ fontSize:'0.85rem', color:'var(--gray-400)', padding:'1rem 0' }}>
                  No adjustments have been made to this account yet.
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                  {balance_history.map(h => (
                    <div key={h.id} style={{ display:'flex', alignItems:'flex-start', gap:'0.75rem', padding:'0.75rem', background:'var(--gray-50)', borderRadius:'var(--radius-md)', border:'1px solid var(--gray-200)' }}>
                      <span className={`badge badge-${ADJUSTMENT_LABELS[h.type]?.color || 'info'}`} style={{ flexShrink:0 }}>
                        {ADJUSTMENT_LABELS[h.type]?.label || h.type}
                      </span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:'0.85rem', color:'var(--gray-700)' }}>{h.reason}</div>
                        <div style={{ fontSize:'0.74rem', color:'var(--gray-400)', marginTop:'0.2rem' }}>
                          {(h.type === 'add' || h.type === 'deduct') && `$${parseFloat(h.amount).toLocaleString()} · `}
                          ${parseFloat(h.balance_before).toLocaleString()} → ${parseFloat(h.balance_after).toLocaleString()}
                          {' · '}{h.admin_name}{' · '}{new Date(h.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="adm-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 className="adm-card__title">Mailing / Postal Information</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setCorrectingAddress(true)}>
                <FiEdit3 size={13} /> Correct
              </button>
            </div>
            <dl className="fin-kv">
              <div><dt>Address Line 1</dt><dd>{mailing_address.address_line_1 || '—'}</dd></div>
              <div><dt>Address Line 2</dt><dd>{mailing_address.address_line_2 || '—'}</dd></div>
              <div><dt>City</dt><dd>{mailing_address.city || '—'}</dd></div>
              <div><dt>State / Province</dt><dd>{mailing_address.state || '—'}</dd></div>
              <div><dt>Postal / ZIP Code</dt><dd>{mailing_address.postal_code || '—'}</dd></div>
              <div><dt>Country</dt><dd>{mailing_address.country || '—'}</dd></div>
            </dl>
            <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: '0.75rem' }}>
              Private investor information — visible only to authorized staff. Any correction is recorded in the audit log below.
            </div>
          </div>

          {investments.length > 0 && (
            <div className="adm-card">
              <h3 className="adm-card__title">Investment Portfolio</h3>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Reference</th><th>Plan</th><th>Amount</th><th>ROI</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {investments.map(i => (
                      <tr key={i.id}>
                        <td><code style={{ fontSize: '0.75rem' }}>{i.reference}</code></td>
                        <td>{i.plan_name||'—'}</td>
                        <td>${parseFloat(i.amount||0).toLocaleString()}</td>
                        <td style={{color:'var(--success)',fontWeight:700}}>+{i.profit_percent||0}%</td>
                        <td><span className={`badge badge-${i.status==='active'?'success':'info'}`}>{i.status}</span></td>
                        <td>
                          {i.status === 'active' && !i.is_paid ? (
                            <button className="btn btn-ghost btn-sm" onClick={() => setCorrecting(i)}>
                              <FiEdit3 size={13} /> Correct
                            </button>
                          ) : <span style={{ color: 'var(--gray-300)', fontSize: '0.78rem' }}>Locked</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(deposits.length > 0 || withdrawals.length > 0) && (
            <div className="adm-card">
              <h3 className="adm-card__title">Deposit &amp; Withdrawal Records</h3>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Type</th><th>Reference</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {deposits.map(d => (
                      <tr key={`d-${d.id}`}>
                        <td><span className="fin-type-pill fin-type-pill--deposit">Deposit</span></td>
                        <td><code style={{ fontSize: '0.75rem' }}>{d.reference}</code></td>
                        <td>${parseFloat(d.amount).toLocaleString()}</td>
                        <td style={{ textTransform: 'capitalize' }}>{d.method}</td>
                        <td><span className={`badge badge-${d.status === 'approved' ? 'success' : d.status === 'rejected' ? 'danger' : 'warning'}`}>{d.status}</span></td>
                        <td style={{ fontSize: '0.82rem' }}>{new Date(d.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {withdrawals.map(w => (
                      <tr key={`w-${w.id}`}>
                        <td><span className="fin-type-pill fin-type-pill--withdrawal">Withdrawal</span></td>
                        <td>WDR-{String(w.id).padStart(6, '0')}</td>
                        <td>${parseFloat(w.amount).toLocaleString()}</td>
                        <td style={{ textTransform: 'capitalize' }}>{w.method}</td>
                        <td><span className={`badge badge-${w.status === 'approved' ? 'success' : w.status === 'rejected' ? 'danger' : 'warning'}`}>{w.status}</span></td>
                        <td style={{ fontSize: '0.82rem' }}>{new Date(w.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {audit_history.length > 0 && (
            <div className="adm-card">
              <h3 className="adm-card__title">Previous Corrections &amp; Financial Team Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {audit_history.map(a => (
                  <div key={a.id} className="fin-audit-card">
                    <div className="fin-audit-card__head">
                      <strong>{a.action}</strong>
                      <span style={{ color: 'var(--gray-400)' }}>{a.reference} · {new Date(a.created_at).toLocaleString()}</span>
                    </div>
                    {a.reason && <div style={{ fontSize: '0.82rem' }}>{a.reason}</div>}
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>By {a.actor_name} ({a.actor_role})</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {correctingAddress && (
        <MailingAddressModal
          current={mailing_address}
          onClose={() => setCorrectingAddress(false)}
          onSubmit={handleMailingCorrection}
          submitting={submitting}
        />
      )}

      {correcting && (
        <CorrectionModal
          investment={correcting}
          onClose={() => setCorrecting(null)}
          onSubmit={handleCorrection}
          submitting={submitting}
        />
      )}

      {activeModal && (
        <BalanceActionModal
          type={activeModal}
          currentBalance={user.balance}
          onClose={() => setActiveModal(null)}
          onSubmit={handleBalanceAction}
          submitting={submitting}
        />
      )}
    </div>
  );
}