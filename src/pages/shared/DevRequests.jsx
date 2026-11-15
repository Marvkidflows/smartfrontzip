// LOCATION: src/pages/shared/DevRequests.jsx
//
// MarvFlow Team Dashboard — the Smart System Investment side. This one
// component is mounted at BOTH /admin/dev-requests and
// /financial/dev-requests (see App.jsx) — devRequestService picks the
// right API prefix automatically based on the current path, so no role
// prop needs to be threaded through. Reuses AdminPages.css (adm-*
// classes) rather than inventing new styling, same as every other
// dashboard page in this app.
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiLifeBuoy, FiPlus, FiEye } from 'react-icons/fi';
import { devRequestService } from '../../services/api';
import toast from 'react-hot-toast';
import { AttachmentField, useAttachmentState, describeUploadError } from '../../components/TeamAttachments';
import '../admin/AdminPages.css';

const PRIORITY_BADGE = { normal: 'info', high: 'warning', urgent: 'danger' };
const STATUS_BADGE = {
  new: 'info', acknowledged: 'warning', in_progress: 'warning',
  waiting_for_info: 'warning', resolved: 'success', closed: 'default',
};
const STATUS_LABEL = {
  new: 'New', acknowledged: 'Acknowledged', in_progress: 'In Progress',
  waiting_for_info: 'Waiting for Info', resolved: 'Resolved', closed: 'Closed',
};

function NewRequestModal({ onClose, onSubmitted }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal');
  const att = useAttachmentState();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error('Subject and message are required.');
      return;
    }
    if (submitting) return;                         // blocks duplicate submissions while an upload is in flight
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('subject', subject.trim());
      form.append('message', message.trim());
      form.append('priority', priority);
      if (att.file) { form.append('attachment', att.file); att.begin(); }

      const res = await devRequestService.submitRequest(form, { onUploadProgress: att.onProgress });
      const req = res.data?.request;
      toast.success(
        <div>
          <strong>Request Submitted Successfully</strong>
          <div style={{ fontSize: '0.85rem', marginTop: 4 }}>
            Request ID: {req?.display_id} — our development team has received your request.
          </div>
        </div>,
        { duration: 6000 }
      );
      onSubmitted();
      onClose();
    } catch (err) {
      const msg = describeUploadError(err, 'Failed to submit request.');
      if (att.file) att.fail(msg);                  // keep the form + file so the user can retry
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(26,58,143,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--royal)', flexShrink: 0 }}>
            <FiLifeBuoy size={19} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 0 }}>Contact Development Team</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>Report a bug, request a fix, or ask for help</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Subject</label>
            <input
              type="text" className="form-control" required autoFocus maxLength={200}
              placeholder="e.g. Registration issue — phone validation"
              value={subject} onChange={e => setSubject(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select className="form-control" value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Message</label>
            <textarea
              className="form-control" rows={5} required maxLength={5000}
              placeholder="Describe the issue, what you expected, and any steps to reproduce it…"
              value={message} onChange={e => setMessage(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Attachment — screenshot or document (optional)</label>
            <AttachmentField id="dev-request-attachment" att={att} disabled={submitting} />
          </div>
          <div className="adm-modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <span className="spinner" /> : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DevRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchRequests = () => {
    devRequestService.getRequests()
      .then(res => setRequests(res.data?.requests || []))
      .catch(() => toast.error('Failed to load requests'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRequests(); }, []);

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div><h1>Contact Development Team</h1><p>Report bugs, request fixes, or ask MarvFlow for help — track responses here</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <FiPlus size={15} /> New Request
        </button>
      </div>

      <div className="adm-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>Loading requests…</div>
        ) : requests.length === 0 ? (
          <div className="adm-empty">
            <FiLifeBuoy size={36} />
            <p>No requests yet. Use "New Request" to contact the development team.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>Subject</th><th>Priority</th><th>Status</th>
                  <th>Assigned To</th><th>Date</th><th>Replies</th><th></th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 700, color: 'var(--navy)' }}>{r.display_id}</td>
                    <td>{r.subject}</td>
                    <td><span className={`badge badge-${PRIORITY_BADGE[r.priority]}`}>{r.priority}</span></td>
                    <td><span className={`badge badge-${STATUS_BADGE[r.status]}`}>{STATUS_LABEL[r.status]}</span></td>
                    <td>{r.assigned_to || <span style={{ color: 'var(--gray-400)' }}>Unassigned</span>}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>{r.messages_count}</td>
                    <td>
                      <Link to={`${window.location.pathname.startsWith('/financial') ? '/financial' : '/admin'}/dev-requests/${r.id}`} className="btn btn-ghost btn-sm">
                        <FiEye size={13} /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <NewRequestModal onClose={() => setShowModal(false)} onSubmitted={fetchRequests} />
      )}
    </div>
  );
}
