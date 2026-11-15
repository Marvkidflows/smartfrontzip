// LOCATION: src/pages/registration/RegistrationApplicationDetail.jsx
// Task 2 — KYC review: applicant data, documents, status actions, notes, information requests, follow-up, history, communications.
// The buttons shown follow the server's `permissions` block, but the server re-checks every action — hiding a button is not the control.
import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { registrationService } from '../../services/api';
import useAuthStore from '../../store/authStore';
import { safeHttpsUrl } from '../../utils/registrationResume';
import { statusBadge, statusLabel, eventLabel, fmtDateTime } from '../../utils/registrationStatus';
import '../admin/AdminPages.css';
import './RegistrationPages.css';

const Field = ({ label, value }) => (<div className="reg-field"><dt>{label}</dt><dd>{value || value === 0 ? value : '—'}</dd></div>);

function ActionModal({ title, label, required, confirmLabel, danger, onClose, onSubmit }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (required && !text.trim()) { toast.error(`${label} is required.`); return; }
    setSaving(true);
    try { await onSubmit(text.trim()); onClose(); } catch { /* the caller has already shown the error */ } finally { setSaving(false); }
  };
  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <h3>{title}</h3>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-action-text">{label}{required ? '' : ' (optional)'}</label>
            <textarea id="reg-action-text" className="form-control" rows={4} maxLength={2000} value={text} onChange={e => setText(e.target.value)} style={{ resize: 'vertical' }} />
          </div>
          <div className="adm-modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={saving}>{saving ? <span className="spinner" /> : confirmLabel}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RegistrationApplicationDetail() {
  const { id } = useParams();
  const me = useAuthStore(st => st.user);
  const [data, setData] = useState(null);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await registrationService.showApplication(id);
      setData(res.data);
    } catch (err) {
      setError(err.response?.status === 404 ? 'Application not found.' : (err.response?.data?.message || 'Failed to load the application.'));
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); registrationService.getTeam().then(r => setTeam(r.data.team || [])).catch(() => {}); }, [load]);

  // Runs an API action, shows the server's message (including business-rule refusals), reloads on success.
  const act = (fn, okMsg) => async (...args) => {
    try { const res = await fn(...args); toast.success(res.data?.message || okMsg); await load(); }
    catch (err) {
      const e = err.response?.data;
      toast.error(e?.message || Object.values(e?.errors || {})[0]?.[0] || 'Action failed.');
      throw err;
    }
  };

  if (loading) return <div className="adm-page"><div className="adm-card" style={{ textAlign: 'center', color: 'var(--gray-400)' }}>Loading…</div></div>;
  if (error) return (<div className="adm-page"><div className="adm-card" role="alert">{error} <Link to="/registration/applications">Back to applications</Link></div></div>);

  const a = data.application;
  const perm = a.permissions;
  const d = a.applicant_details;
  const can = (s) => perm.allowed_transitions.includes(s);
  const confirmThen = (msg, fn) => { if (window.confirm(msg)) fn().catch(() => {}); };

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div>
          <Link to="/registration/applications" style={{ fontSize: '0.82rem' }}><FiArrowLeft size={12} /> Applications</Link>
          <h1>{a.applicant.name} <span className={statusBadge(a.status)}>{statusLabel(a.status)}</span></h1>
          <p>Application #{a.id} · started {fmtDateTime(a.started_at)} · stage {a.stage_reached}/4</p>
        </div>
      </div>

      <div className="adm-card" style={{ marginBottom: '1rem' }}>
        <h3 className="adm-card__title">Review actions</h3>
        <div className="reg-actions">
          {can('under_review') && <button className="btn btn-primary btn-sm" onClick={() => act(registrationService.setStatus, 'Review started.')(a.id, 'under_review').catch(() => {})}>{a.status === 'submitted' ? 'Start review' : 'Reopen for review'}</button>}
          {can('submitted') && <button className="btn btn-ghost btn-sm" onClick={() => confirmThen('Release this application back to the queue?', () => act(registrationService.setStatus, 'Released.')(a.id, 'submitted'))}>Release to queue</button>}
          {can('additional_info_required') && <button className="btn btn-warning-outline btn-sm" onClick={() => setModal('info')}>Request additional information</button>}
          {can('approved') && <button className="btn btn-success btn-sm" onClick={() => setModal('approve')}>Approve</button>}
          {can('rejected') && <button className="btn btn-danger btn-sm" onClick={() => setModal('reject')}>Reject</button>}
          <button className="btn btn-ghost btn-sm" onClick={() => setModal('note')}>Add internal note</button>
          {(a.status === 'pending' || a.status === 'additional_info_required') && (
            <button className="btn btn-ghost btn-sm" disabled={!!perm.follow_up_blocked_reason} title={perm.follow_up_blocked_reason || ''} onClick={() => setModal('followup')}>Send follow-up</button>
          )}
        </div>
        {(a.status === 'pending' || a.status === 'additional_info_required') && perm.follow_up_blocked_reason && (
          <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.5rem' }}>Follow-up unavailable: {perm.follow_up_blocked_reason}</p>
        )}
        {!perm.can_decide && <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.5rem' }}>Approving or rejecting an application needs a Registration Team lead.</p>}
        {a.review.info_request && a.status === 'additional_info_required' && <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}><strong>Requested from applicant:</strong> {a.review.info_request}</p>}
        {a.review.decision_reason && <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}><strong>Decision reason:</strong> {a.review.decision_reason}{a.review.decided_by ? ` — ${a.review.decided_by.name}` : ''}</p>}
        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.85rem' }}>
          <span>Assigned to: <strong>{a.assigned_to?.name || 'nobody'}</strong></span>
          {a.assigned_to?.id !== me?.id && (
            <button className="btn btn-ghost btn-sm" onClick={() => act(registrationService.assign, 'Assigned to you.')(a.id, me.id).catch(() => {})}>Assign to me</button>
          )}
          {perm.can_assign_others ? (
            <select className="form-control" style={{ width: 'auto' }} value={a.assigned_to?.id || ''} aria-label="Assign to"
              onChange={e => act(registrationService.assign, 'Assignment updated.')(a.id, e.target.value ? Number(e.target.value) : null).catch(() => {})}>
              <option value="">Unassigned</option>
              {team.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          ) : null}
        </div>
      </div>

      <div className="reg-grid2">
        <div className="adm-card">
          <h3 className="adm-card__title">Applicant</h3>
          <dl>
            <Field label="Name" value={d.name} /><Field label="Email" value={d.email ? `${d.email}${d.email_verified_at ? ' (verified)' : ' (not verified)'}` : null} />
            <Field label="Phone" value={d.phone} /><Field label="Country" value={d.country} /><Field label="Date of birth" value={d.date_of_birth} />
            <Field label="Address" value={[d.residential_address, d.address_line_2, d.city, d.state, d.postal_code].filter(Boolean).join(', ')} />
            <Field label="Employment" value={d.employment_status} /><Field label="Income range" value={d.annual_income_range} />
            <Field label="Source of funds" value={d.source_of_funds} /><Field label="Investment experience" value={d.investment_experience} />
            <Field label="Risk tolerance" value={d.risk_tolerance} /><Field label="Objectives" value={d.investment_objectives} />
            <Field label="Privacy policy acknowledged" value={d.privacy_policy_acknowledged_at ? fmtDateTime(d.privacy_policy_acknowledged_at) : 'Not recorded'} />
          </dl>
        </div>

        <div className="adm-card">
          <h3 className="adm-card__title">KYC submission</h3>
          {!safeHttpsUrl(a.kyc.id_document_url) ? <div className="adm-empty"><p>{a.kyc_submitted_at || a.kyc_documents ? 'A document was submitted but its link is not a secure https address, so it is not shown. Ask an administrator to check it.' : 'No KYC documents submitted yet.'}</p></div> : (
            <>
              <dl><Field label="ID type" value={a.kyc.id_type?.replace(/_/g, ' ')} /><Field label="ID number" value={a.kyc.id_number} /><Field label="Submitted" value={fmtDateTime(a.kyc_submitted_at)} /></dl>
              <div className="reg-docs">
                <div><div className="reg-field"><dt>Government ID</dt></div><a href={safeHttpsUrl(a.kyc.id_document_url)} target="_blank" rel="noopener noreferrer"><img src={safeHttpsUrl(a.kyc.id_document_url)} alt="Government ID" /></a></div>
                <div><div className="reg-field"><dt>Selfie with ID</dt></div>{safeHttpsUrl(a.kyc.selfie_url) ? <a href={safeHttpsUrl(a.kyc.selfie_url)} target="_blank" rel="noopener noreferrer"><img src={safeHttpsUrl(a.kyc.selfie_url)} alt="Selfie with ID" /></a> : <p>None</p>}</div>
              </div>
              {a.kyc.rejection_reason && <p style={{ fontSize: '0.82rem', marginTop: '0.75rem' }}><strong>Previous rejection:</strong> {a.kyc.rejection_reason}</p>}
            </>
          )}
        </div>
      </div>

      <div className="reg-grid2" style={{ marginTop: '1rem' }}>
        <div className="adm-card">
          <h3 className="adm-card__title">History &amp; activity</h3>
          <ul className="reg-timeline">
            {data.timeline.map(e => (
              <li key={e.id}>
                <strong>{eventLabel(e.type)}</strong>
                {e.from_status && e.to_status && <> {statusLabel(e.from_status)} → {statusLabel(e.to_status)}</>}
                {!e.from_status && e.to_status && <> → {statusLabel(e.to_status)}</>}
                {e.type === 'stage_completed' && e.meta?.stage ? ` ${e.meta.stage}` : ''}
                {e.note && <div style={{ whiteSpace: 'pre-wrap' }}>{e.note}</div>}
                <small>{fmtDateTime(e.created_at)}{e.actor ? ` · ${e.actor.name}` : ' · applicant/system'}</small>
              </li>
            ))}
          </ul>
        </div>
        <div className="adm-card">
          <h3 className="adm-card__title">Messages to applicant</h3>
          {data.communications.length === 0 ? <div className="adm-empty"><p>No messages sent.</p></div> : data.communications.map(c => (
            <div key={c.id} style={{ borderBottom: '1px solid var(--gray-200)', padding: '0.6rem 0', fontSize: '0.84rem' }}>
              <strong>{c.subject}</strong>{' '}
              <span className={`badge badge-${c.status === 'sent' ? 'success' : c.status === 'failed' ? 'danger' : 'warning'}`}>{c.status}</span>
              <div style={{ whiteSpace: 'pre-wrap', margin: '0.25rem 0' }}>{c.body}</div>
              <small style={{ color: 'var(--gray-500)' }}>{c.kind.replace('_', ' ')} · to {c.to_email} · {fmtDateTime(c.sent_at || c.created_at)}{c.sent_by ? ` · ${c.sent_by.name}` : ''}</small>
              {c.error && <div style={{ color: 'var(--danger)', fontSize: '0.78rem' }}>Delivery error: {c.error}</div>}
            </div>
          ))}
          <div style={{ marginTop: '0.75rem', fontSize: '0.82rem' }}>
            <label style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <input type="checkbox" checked={a.followup_opted_out}
                onChange={e => confirmThen(e.target.checked ? 'Record that this applicant does not want follow-up messages?' : 'Lift the follow-up opt-out?', () => act(registrationService.setFollowUpOptOut, 'Preference recorded.')(a.id, e.target.checked))} />
              Applicant opted out of follow-up messages
            </label>
          </div>
        </div>
      </div>

      {modal === 'info' && <ActionModal title="Request additional information" label="What must the applicant provide? (sent to them by email and in-app)" required confirmLabel="Send request" onClose={() => setModal(null)} onSubmit={(t) => act(registrationService.requestInfo, 'Requested.')(a.id, t)} />}
      {modal === 'approve' && <ActionModal title="Approve application" label="Approval note" confirmLabel="Approve" onClose={() => setModal(null)} onSubmit={(t) => act(registrationService.setStatus, 'Approved.')(a.id, 'approved', t)} />}
      {modal === 'reject' && <ActionModal title="Reject application" label="Reason (shown to the applicant)" required danger confirmLabel="Reject" onClose={() => setModal(null)} onSubmit={(t) => act(registrationService.setStatus, 'Rejected.')(a.id, 'rejected', t)} />}
      {modal === 'note' && <ActionModal title="Add internal note" label="Note (visible to the Registration Team only)" required confirmLabel="Save note" onClose={() => setModal(null)} onSubmit={(t) => act(registrationService.addNote, 'Note saved.')(a.id, t)} />}
      {modal === 'followup' && <ActionModal title="Send follow-up" label="Message to the applicant" required confirmLabel="Send" onClose={() => setModal(null)} onSubmit={(t) => act(registrationService.followUp, 'Sent.')(a.id, t)} />}
    </div>
  );
}
