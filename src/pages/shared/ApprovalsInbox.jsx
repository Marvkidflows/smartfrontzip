// LOCATION: src/pages/shared/ApprovalsInbox.jsx
//
// R4: the second-approval inbox, used by BOTH the Admin and the Financial layouts (/admin/approvals, /financial/approvals).
// The server is the authority: every action is re-checked there (never the requester, role, account status, state). The buttons shown here are
// driven by the server's can_decide / can_retry / can_cancel flags and are only a convenience.
import { useCallback, useEffect, useRef, useState } from 'react';
import { FiCheckCircle, FiXCircle, FiRefreshCw, FiEye, FiSlash, FiAlertTriangle, FiClock } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { approvalService } from '../../services/api';
import { adjustmentErrorMessage } from '../../utils/approvalResponse';
import { operationLabel, STATUS_FILTERS, statusTone, statusLabel, summarizeChange, beforeAfterRows, decisionBlocker, money } from '../../utils/approvalView';
import '../admin/AdminPages.css';

const when = (s) => (s ? new Date(s.replace(' ', 'T')).toLocaleString() : '—');
const who = (u) => (u ? `${u.name} (${u.role})` : '—');

// ── presentational pieces (exported so they can be rendered with fixture data in tests; they hold no state and make no requests) ─────────────

export function ApprovalDetailView({ req, note, onNote, busy, onClose, onApprove, onReject, onRetry, onCancel }) {
  const blocker = decisionBlocker(req);
  const canAny = req.can_decide || req.can_retry || req.can_cancel;
  return (
    <>
      <h3 style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
        Request #{req.id} — {operationLabel(req.operation)}
        <span className={`badge badge-${statusTone(req)}`}>{statusLabel(req)}</span>
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem 1.25rem', fontSize: '0.85rem', margin: '0.75rem 0' }}>
        <div><strong>Requested by</strong><br />{who(req.requested_by)}</div>
        <div><strong>Submitted</strong><br />{when(req.created_at)}</div>
        <div><strong>Affected account</strong><br />{req.target ? `${req.target.name} (${req.target.email})` : 'Multiple / n.a.'}</div>
        <div><strong>Authorization reference</strong><br />{req.authorization_reference || '—'}</div>
        {req.expires_at && <div><strong>Expires</strong><br />{when(req.expires_at)}</div>}
        {req.decided_by && <div><strong>Decided by</strong><br />{who(req.decided_by)} · {when(req.decided_at)}</div>}
      </div>

      <div className="form-group"><strong style={{ fontSize: '0.85rem' }}>Reason given</strong>
        <div style={{ fontSize: '0.88rem', whiteSpace: 'pre-wrap' }}>{req.reason || '—'}</div></div>

      <div className="table-wrap" style={{ marginBottom: '1rem' }}>
        <table>
          <thead><tr><th>Item</th><th>Before</th><th>After{req.status === 'executed' ? '' : ' (proposed)'}</th></tr></thead>
          <tbody>{beforeAfterRows(req).map(r => <tr key={r.label}><td style={{ textTransform: 'capitalize' }}>{r.label}</td><td>{r.before}</td><td><strong>{r.after}</strong></td></tr>)}</tbody>
        </table>
        {req.change?.note && <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '0.35rem' }}>{req.change.note}</div>}
      </div>

      {(req.status === 'failed' || req.is_stuck || req.last_error) && (
        <div className="inv-announcement" role="alert" style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <FiAlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <div><strong>{req.is_stuck ? 'Execution did not complete.' : 'Execution failed — nothing was changed.'}</strong>
            <div style={{ fontSize: '0.85rem' }}>{req.last_error || 'The request was interrupted before it finished.'}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>Attempts: {req.execution_attempts}</div></div>
        </div>
      )}
      {req.status === 'executed' && <div style={{ fontSize: '0.85rem', marginBottom: '1rem' }}><FiCheckCircle /> Executed {when(req.executed_at)}.</div>}
      {req.cancel_reason && <div style={{ fontSize: '0.85rem', marginBottom: '1rem' }}><FiSlash /> Cancelled: {req.cancel_reason}</div>}
      {req.decision_note && <div style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Decision note: {req.decision_note}</div>}

      {blocker && <div className="inv-announcement" data-testid="blocker" style={{ marginBottom: '1rem' }}>{blocker}</div>}

      {canAny && (
        <div className="form-group">
          <label className="form-label">Note / reason {req.can_decide ? '(required to reject or cancel; optional to approve)' : '(required to cancel)'}</label>
          <textarea className="form-control" rows={2} value={note} onChange={e => onNote(e.target.value)} style={{ resize: 'vertical' }} />
        </div>
      )}

      <h4 style={{ margin: '0.75rem 0 0.4rem' }}><FiClock /> Audit history</h4>
      <div className="table-wrap" style={{ marginBottom: '1rem' }}>
        <table>
          <thead><tr><th>When</th><th>Event</th><th>By</th><th>Status</th><th>Note</th></tr></thead>
          <tbody>{(req.events || []).map(ev => (
            <tr key={ev.id}><td style={{ fontSize: '0.78rem' }}>{when(ev.created_at)}</td><td>{ev.event.replace(/_/g, ' ')}</td>
              <td style={{ fontSize: '0.82rem' }}>{who(ev.actor)}</td><td style={{ fontSize: '0.78rem' }}>{ev.from_status ? `${ev.from_status} → ${ev.to_status}` : ev.to_status}</td>
              <td style={{ fontSize: '0.8rem' }}>{ev.note || ''}</td></tr>
          ))}</tbody>
        </table>
      </div>

      <div className="adm-modal-footer" style={{ flexWrap: 'wrap' }}>
        <button className="btn btn-ghost" onClick={onClose}>Close</button>
        {req.can_cancel && <button className="btn btn-ghost" data-action="cancel" disabled={busy} onClick={onCancel}><FiSlash /> Cancel request</button>}
        {req.can_decide && <button className="btn btn-danger" data-action="reject" disabled={busy} onClick={onReject}><FiXCircle /> Reject</button>}
        {req.can_decide && <button className="btn btn-success" data-action="approve" disabled={busy} onClick={onApprove}><FiCheckCircle /> Approve &amp; execute</button>}
        {req.can_retry && <button className="btn btn-primary" data-action="retry" disabled={busy} onClick={onRetry}><FiRefreshCw /> Retry</button>}
      </div>
    </>
  );
}

export function ApprovalsTable({ rows, onOpen }) {
  if (rows.length === 0) return <div className="adm-empty"><p>No approval requests match these filters.</p></div>;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>#</th><th>Type</th><th>Affected</th><th>Change</th><th>Requested by</th><th>Submitted</th><th>Status</th><th /></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{operationLabel(r.operation)}</td>
              <td style={{ fontSize: '0.82rem' }}>{r.target ? r.target.name : '—'}</td>
              <td style={{ fontSize: '0.82rem', maxWidth: 260 }}>{summarizeChange(r)}</td>
              <td style={{ fontSize: '0.82rem' }}>{who(r.requested_by)}{r.is_own ? ' · you' : ''}</td>
              <td style={{ fontSize: '0.78rem' }}>{when(r.created_at)}</td>
              <td><span className={`badge badge-${statusTone(r)}`}>{statusLabel(r)}</span></td>
              <td><button className="btn btn-ghost btn-sm" onClick={() => onOpen(r.id)}><FiEye /> {r.can_decide || r.can_retry ? 'Review' : 'View'}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailModal({ id, onClose, onChanged }) {
  const [req, setReq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const busy = useRef(false);                       // prevents duplicate submissions even on a fast double click
  const [, force] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    return approvalService.show(id)
      .then(res => setReq(res.data?.request || null))
      .catch(err => { toast.error(adjustmentErrorMessage(err, 'Failed to load the request.')); onClose(); })
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn, okMsg, needNote) => {
    if (busy.current) return;
    if (needNote && note.trim().length < 5) { toast.error('Enter a reason of at least 5 characters.'); return; }
    busy.current = true; force(n => n + 1);
    try {
      const res = await fn();
      toast.success(res.data?.message || okMsg);
      setNote('');
    } catch (err) {
      toast.error(adjustmentErrorMessage(err, 'The action failed.'));   // a failed execution is recorded as "failed" server-side; reload shows it
    } finally {
      busy.current = false; force(n => n + 1);
      onChanged();
      load();
    }
  };

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" style={{ maxWidth: 760, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        {loading && !req ? <div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div> : !req ? null : (
          <ApprovalDetailView
            req={req} note={note} onNote={setNote} busy={busy.current} onClose={onClose}
            onCancel={() => run(() => approvalService.cancel(req.id, note.trim()), 'Request cancelled.', true)}
            onReject={() => run(() => approvalService.reject(req.id, note.trim()), 'Request rejected.', true)}
            onApprove={() => run(() => approvalService.approve(req.id, note.trim() || undefined), 'Approved and executed.', false)}
            onRetry={() => run(() => approvalService.retry(req.id, note.trim() || undefined), 'Retried and executed.', false)}
          />
        )}
      </div>
    </div>
  );
}

export default function ApprovalsInbox() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('open');
  const [operation, setOperation] = useState('');
  const [requester, setRequester] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [requesters, setRequesters] = useState({});
  const [openId, setOpenId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = { status, ...(operation ? { operation } : {}), ...(requester ? { requested_by: requester } : {}), ...(from ? { date_from: from } : {}), ...(to ? { date_to: to } : {}) };
    return approvalService.list(params)
      .then(res => {
        const list = res.data?.requests || [];
        setRows(list); setMeta(res.data?.meta || null);
        setRequesters(prev => { const n = { ...prev }; list.forEach(r => { if (r.requested_by) n[r.requested_by.id] = r.requested_by.name; }); return n; });
      })
      .catch(err => toast.error(adjustmentErrorMessage(err, 'Failed to load approval requests.')))
      .finally(() => setLoading(false));
  }, [status, operation, requester, from, to]);
  useEffect(() => { load(); }, [load]);

  const operations = ['balance_adjust', 'bulk_balance', 'profit_adjust', 'profit_reverse', 'investment_correction'];

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div><h1>Approvals</h1><p>High-risk financial changes wait here for a second, different authorised person. Nothing below has changed any balance or record until it shows “executed”.</p></div>
        <button className="btn btn-ghost" onClick={load} disabled={loading}><FiRefreshCw /> Refresh</button>
      </div>

      <div className="adm-filter-row" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <select className="form-control" style={{ maxWidth: 220 }} value={status} onChange={e => setStatus(e.target.value)} aria-label="Status">
          {STATUS_FILTERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className="form-control" style={{ maxWidth: 220 }} value={operation} onChange={e => setOperation(e.target.value)} aria-label="Request type">
          <option value="">All request types</option>
          {operations.map(o => <option key={o} value={o}>{operationLabel(o)}</option>)}
        </select>
        <select className="form-control" style={{ maxWidth: 200 }} value={requester} onChange={e => setRequester(e.target.value)} aria-label="Requester">
          <option value="">Any requester</option>
          {Object.entries(requesters).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <input type="date" className="form-control" style={{ maxWidth: 160 }} value={from} onChange={e => setFrom(e.target.value)} aria-label="From date" />
        <input type="date" className="form-control" style={{ maxWidth: 160 }} value={to} onChange={e => setTo(e.target.value)} aria-label="To date" />
      </div>

      {loading && rows.length === 0 ? <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>Loading…</div> : <ApprovalsTable rows={rows} onOpen={setOpenId} />}
      {meta && meta.total > rows.length && <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: '0.5rem' }}>Showing {rows.length} of {meta.total}. Narrow the filters to see others.</div>}
      {openId && <DetailModal id={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </div>
  );
}
