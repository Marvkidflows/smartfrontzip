// LOCATION: src/pages/financial/FinancialTransactions.jsx
//
// Replaces the earlier client-merged deposits+withdrawals stub with the
// real unified transaction view: deposits, withdrawals, investment records
// and wallet adjustments in one searchable, filterable, paginated table,
// backed by GET /financial/transactions (FinancialTransactionController).
// Approve/reject/hold still go through the existing, audited
// /financial/deposits|withdrawals endpoints — this page just triggers them
// and refreshes. Clicking a row opens the full detail (before/after values,
// who/when, audit trail) via GET /financial/transactions/{type}/{id}.
import { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import { financialService } from '../../services/api';
import toast from 'react-hot-toast';
import RecordPaymentModal from '../../components/RecordPaymentModal';
import '../admin/AdminPages.css';
import { NameWithRank } from '../../components/RankBadge';
import './FinancialPages.css';

const TYPE_LABEL = { deposit: 'Deposit', withdrawal: 'Withdrawal', investment: 'Investment', adjustment: 'Wallet Adjustment' };
const STATUS_COLOR = { pending: 'warning', approved: 'success', rejected: 'danger', completed: 'success', cancelled: 'danger' };

function ActionModal({ title, cta, danger, onClose, onSubmit, submitting, requireReason }) {
  const [reason, setReason] = useState('');
  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <h3>{title}</h3>
        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label className="form-label">Reason {requireReason ? '' : <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>(optional)</span>}</label>
          <textarea className="form-control" rows={3} style={{ resize: 'vertical' }}
            placeholder="Recorded in the audit log" value={reason} onChange={e => setReason(e.target.value)} />
        </div>
        <div className="adm-modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-success'}`} disabled={submitting || (requireReason && !reason.trim())}
            onClick={() => onSubmit(reason.trim())}>
            {submitting ? <span className="spinner" /> : cta}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailModal({ type, id, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState(null); // 'approve' | 'reject' | 'hold'
  const [showPayment, setShowPayment] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    financialService.showTransaction(type, id).then(res => setData(res.data)).catch(() => toast.error('Failed to load transaction')).finally(() => setLoading(false));
  }, [type, id]);
  useEffect(() => { load(); }, [load]);

  const runAction = async (action, reason) => {
    setSubmitting(true);
    try {
      const depositSvc = { approve: financialService.approveDeposit, reject: financialService.rejectDeposit, hold: financialService.holdDeposit };
      const withdrawalSvc = { approve: financialService.approveWithdrawal, reject: financialService.rejectWithdrawal, hold: financialService.holdWithdrawal };
      const svc = type === 'withdrawal' ? withdrawalSvc : depositSvc;
      await svc[action](id, reason ? { reason } : undefined);
      toast.success(`Transaction ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'placed on hold'}.`);
      setPendingAction(null);
      load();
      onChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed.');
      if (err.response?.data?.code === 'payment_unverified') { setPendingAction(null); setShowPayment(true); }
    }
    finally { setSubmitting(false); }
  };

  const t = data?.transaction;

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal fin-modal-wide" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h3>{TYPE_LABEL[type]} {t ? `#${t.reference}` : ''}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><FiX /></button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>Loading…</div>
        ) : !t ? (
          <div className="adm-empty"><p>Not found.</p></div>
        ) : (
          <>
            <dl className="fin-kv" style={{ marginTop: '1rem' }}>
              <div><dt>Investor</dt><dd><NameWithRank name={data.investor.name} rank={data.investor.rank} size="md" /><br /><span style={{ fontWeight: 400, fontSize: '0.78rem', color: 'var(--gray-400)' }}>{data.investor.email}</span></dd></div>
              <div><dt>Amount</dt><dd>${Number(t.amount).toLocaleString()}</dd></div>
              <div><dt>Status</dt><dd><span className={`badge badge-${STATUS_COLOR[t.status] || 'info'}`}>{t.status}{t.on_hold ? ' (hold)' : ''}</span></dd></div>
              <div><dt>Recorded</dt><dd>{new Date(t.created_at).toLocaleString()}</dd></div>
              {t.method && <div><dt>Method</dt><dd style={{ textTransform: 'capitalize' }}>{t.method}</dd></div>}
              {t.plan && <div><dt>Plan</dt><dd>{t.plan}</dd></div>}
              {t.processed_by && <div><dt>Processed by</dt><dd>{t.processed_by}</dd></div>}
              {t.performed_by && <div><dt>Performed by</dt><dd>{t.performed_by}</dd></div>}
              {t.reason && <div><dt>Reason</dt><dd>{t.reason}</dd></div>}
              {t.admin_notes && <div><dt>Notes</dt><dd>{t.admin_notes}</dd></div>}
              {t.payment && (
                <div><dt>Actually paid</dt><dd>
                  {t.payment.paid_amount !== null ? `${Number(t.payment.paid_amount).toLocaleString()} ${t.payment.paid_currency || ''}` : '—'}
                  {t.payment.paid_currency && t.payment.paid_currency !== 'USD' && t.payment.fx_rate ? ` @ ${t.payment.fx_rate} (${t.payment.rate_source || 'no source'}, ${t.payment.rate_date || 'no date'})` : ''}
                  <br /><span style={{ fontWeight: 400, fontSize: '0.78rem', color: 'var(--gray-400)' }}>
                    {t.payment.verified ? '✓ verified by SSI personnel' : 'declared by the investor — not verified'}
                    {t.payment.external_reference ? ` · ref ${t.payment.external_reference}` : ''}{t.payment.funding_channel ? ` · via ${t.payment.funding_channel}` : ''}
                  </span></dd></div>
              )}
            </dl>

            {type === 'investment' && (
              <dl className="fin-kv" style={{ marginTop: '0.75rem' }}>
                <div><dt>ROI</dt><dd>{t.profit_percentage}%</dd></div>
                <div><dt>Expected Profit</dt><dd>${Number(t.expected_profit).toLocaleString()}</dd></div>
                <div><dt>Total Return</dt><dd>${Number(t.total_return).toLocaleString()}</dd></div>
                <div><dt>Term</dt><dd>{t.start_date} → {t.end_date}</dd></div>
              </dl>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
              {type === 'deposit' && data.actions.approve && <button className="btn btn-ghost btn-sm" onClick={() => setShowPayment(true)}>Record payment…</button>}
              {data.actions.approve && <button className="btn btn-success btn-sm" onClick={() => setPendingAction('approve')}>Approve</button>}
              {data.actions.hold && <button className="btn btn-ghost btn-sm" onClick={() => setPendingAction('hold')}>Hold</button>}
              {data.actions.reject && <button className="btn btn-danger btn-sm" onClick={() => setPendingAction('reject')}>Reject</button>}
            </div>

            {data.audit.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: '0.6rem' }}>Correction / Action History</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {data.audit.map(a => (
                    <div key={a.id} className="fin-audit-card">
                      <div className="fin-audit-card__head">
                        <strong>{a.action}</strong>
                        <span style={{ color: 'var(--gray-400)' }}>{a.reference} · {new Date(a.created_at).toLocaleString()}</span>
                      </div>
                      {a.previous_value && a.new_value && (
                        <div className="fin-diff">
                          <div className="fin-diff__before"><h5>Before</h5>{Object.entries(a.previous_value).map(([k, v]) => <div key={k}>{k}: {String(v)}</div>)}</div>
                          <div className="fin-diff__after"><h5>After</h5>{Object.entries(a.new_value).map(([k, v]) => <div key={k}>{k}: {String(v)}</div>)}</div>
                        </div>
                      )}
                      {a.reason && <div style={{ fontSize: '0.82rem', color: 'var(--gray-600)' }}>Reason: {a.reason}</div>}
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>By {a.actor_name} ({a.actor_role})</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {showPayment && t && (
          <RecordPaymentModal deposit={{ id, requested: t.amount, payment: t.payment }}
            submit={(d) => financialService.recordDepositPayment(id, d)} onClose={() => setShowPayment(false)}
            onSaved={() => { setShowPayment(false); load(); onChanged?.(); }} />
        )}
        {pendingAction && (
          <ActionModal
            title={pendingAction === 'approve' ? 'Approve transaction' : pendingAction === 'reject' ? 'Reject transaction' : 'Place on hold'}
            cta={pendingAction === 'approve' ? 'Approve' : pendingAction === 'reject' ? 'Reject' : 'Hold'}
            danger={pendingAction === 'reject'}
            requireReason={pendingAction !== 'approve'}
            submitting={submitting}
            onClose={() => setPendingAction(null)}
            onSubmit={(reason) => runAction(pendingAction, reason)}
          />
        )}
      </div>
    </div>
  );
}

export default function FinancialTransactions() {
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState([]);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', type: '', status: '', date_from: '', date_to: '' });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null); // { type, id }

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) };
    financialService.getTransactions(params)
      .then(res => {
        setRows(res.data.data || []);
        setSummary(res.data.summary);
        setRecent(res.data.recent || []);
        setMeta(res.data.meta || { page: 1, last_page: 1, total: 0 });
      })
      .catch(() => toast.error('Failed to load transactions'))
      .finally(() => setLoading(false));
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  const applyFilter = (key, value) => { setPage(1); setFilters(f => ({ ...f, [key]: value })); };

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div><h1>Transactions</h1><p>Deposits, withdrawals, investment records and wallet adjustments — one unified view</p></div>
      </div>

      <div className="fin-summary-grid">
        {[
          ['Total', summary?.total, 'default'], ['Pending', summary?.pending, 'warning'],
          ['Approved', summary?.approved, 'success'], ['Rejected', summary?.rejected, 'danger'],
        ].map(([label, val, color]) => (
          <div className="adm-card" key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: color === 'default' ? 'var(--navy)' : `var(--${color})` }}>{val ?? '—'}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
          </div>
        ))}
      </div>

      <div className="adm-card">
        <h3 className="adm-card__title">Filter &amp; Search</h3>
        <div className="fin-filters">
          <div>
            <label>Search</label>
            <div className="adm-search"><FiSearch /><input placeholder="Investor name, email, or reference…" value={filters.search} onChange={e => applyFilter('search', e.target.value)} /></div>
          </div>
          <div>
            <label>Type</label>
            <select className="form-control" value={filters.type} onChange={e => applyFilter('type', e.target.value)}>
              <option value="">All types</option>
              {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label>Status</label>
            <select className="form-control" value={filters.status} onChange={e => applyFilter('status', e.target.value)}>
              <option value="">All statuses</option>
              {['pending', 'approved', 'rejected', 'completed', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div><label>From</label><input type="date" className="form-control" value={filters.date_from} onChange={e => applyFilter('date_from', e.target.value)} /></div>
          <div><label>To</label><input type="date" className="form-control" value={filters.date_to} onChange={e => applyFilter('date_to', e.target.value)} /></div>
        </div>
      </div>

      <div className="adm-card">
        <h3 className="adm-card__title">Transactions ({meta.total})</h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className="adm-empty"><p>No transactions match these filters.</p></div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="fin-tx-table">
                <thead><tr><th>Reference</th><th>Investor</th><th>Type</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.key} className="fin-row-click" onClick={() => setSelected({ type: r.type, id: r.id })}>
                      <td><code style={{ fontSize: '0.75rem' }}>{r.reference}</code></td>
                      <td><strong><NameWithRank name={r.investor.name} rank={r.investor.rank} /></strong><div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{r.investor.email}</div></td>
                      <td><span className={`fin-type-pill fin-type-pill--${r.type}`}>{TYPE_LABEL[r.type]}</span></td>
                      <td><strong>${Number(r.amount).toLocaleString()}</strong></td>
                      <td style={{ textTransform: 'capitalize' }}>{r.method || '—'}</td>
                      <td><span className={`badge badge-${STATUS_COLOR[r.status] || 'info'}`}>{r.status}{r.on_hold ? ' · hold' : ''}</span></td>
                      <td style={{ fontSize: '0.82rem' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="fin-pager">
              <span>Page {meta.page} of {meta.last_page}</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                <button className="btn btn-ghost btn-sm" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            </div>
          </>
        )}
      </div>

      {recent.length > 0 && (
        <div className="adm-card">
          <h3 className="adm-card__title">Recent Financial Team Activity</h3>
          <div className="fin-activity">
            {recent.map(a => (
              <div key={a.id} className="fin-activity__item">
                <strong>{a.action}</strong> · {a.actor_name}
                <div className="fin-activity__meta">{a.reference} · {new Date(a.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <DetailModal type={selected.type} id={selected.id} onClose={() => setSelected(null)} onChanged={load} />
      )}
    </div>
  );
}
