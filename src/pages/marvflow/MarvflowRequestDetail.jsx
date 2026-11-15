// LOCATION: src/pages/marvflow/MarvflowRequestDetail.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiSend, FiPaperclip, FiClock } from 'react-icons/fi';
import { marvflowService } from '../../services/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import { AttachmentButton, AttachmentStatus, AttachmentField, AttachmentList, ImageAttachmentLink, useAttachmentState, describeUploadError } from '../../components/TeamAttachments';
import '../admin/AdminPages.css';
import '../investor/InvestorMessages.css';

const PRIORITY_BADGE = { normal: 'info', high: 'warning', urgent: 'danger' };
const STATUS_BADGE = {
  new: 'info', acknowledged: 'warning', in_progress: 'warning',
  waiting_for_info: 'warning', resolved: 'success', closed: 'default',
};

export default function MarvflowRequestDetail() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const isLead = user?.role === 'marvflow_lead';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState([]);
  const [body, setBody] = useState('');
  const att = useAttachmentState();
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const fetchRequest = () => {
    marvflowService.showRequest(id)
      .then(res => setData(res.data?.request))
      .catch(() => toast.error('Failed to load request'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequest();
    if (isLead) {
      marvflowService.getTeam().then(res => setTeam(res.data?.members || [])).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [data?.messages?.length]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!body.trim() || sending) return;          // `sending` blocks duplicate submissions while an upload is in flight
    setSending(true);
    try {
      const form = new FormData();
      form.append('body', body.trim());
      if (att.file) { form.append('attachment', att.file); att.begin(); }
      const res = await marvflowService.reply(id, form, { onUploadProgress: att.onProgress });
      setData(res.data?.request);
      setBody('');
      att.succeed();
    } catch (err) {
      const msg = describeUploadError(err, 'Failed to send reply.');
      if (att.file) att.fail(msg);                  // keep the file + text so the user can retry
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const res = await marvflowService.updateStatus(id, newStatus);
      setData(res.data?.request);
      toast.success('Status updated.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const handlePriorityChange = async (newPriority) => {
    try {
      const res = await marvflowService.updatePriority(id, newPriority);
      setData(res.data?.request);
      toast.success('Priority updated.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update priority.');
    }
  };

  const handleAssign = async (assignedToId) => {
    try {
      const res = await marvflowService.assign(id, assignedToId || null);
      setData(res.data?.request);
      toast.success('Assignment updated.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update assignment.');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>Loading…</div>;
  if (!data) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--danger)' }}>Request not found</div>;

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/marvflow/requests" className="btn btn-ghost btn-sm"><FiArrowLeft /> Back</Link>
          <div><h1>{data.display_id} — {data.subject}</h1><p>From {data.sender_name} ({data.sender_role}) · {data.sender_email}</p></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem', alignItems: 'start' }}>
        {/* LEFT — message + conversation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="adm-card">
            <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Original Message
            </div>
            <p style={{ color: 'var(--gray-700)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{data.message}</p>
            <ImageAttachmentLink url={data.attachment_url} />
            <AttachmentList items={data.attachments} fetchFile={(aid, inline) => marvflowService.attachmentFile(id, aid, inline)} />
          </div>

          <div className="adm-card" style={{ display: 'flex', flexDirection: 'column', height: '50vh' }}>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.5rem' }}>
              {data.messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.85rem', margin: 'auto' }}>No replies yet.</div>
              ) : data.messages.map(m => (
                <div key={m.id} className={`inv-msg-bubble ${m.sender_side === 'marvflow' ? 'bubble-me' : 'bubble-admin'}`}>
                  <div className="inv-msg-bubble__name">
                    {m.sender_side === 'marvflow' ? `You (${m.sender_name})` : `${m.sender_name} (SSI)`}
                  </div>
                  <div className="inv-msg-bubble__text">{m.body}</div>
                  <ImageAttachmentLink url={m.attachment_url} compact />
                  <AttachmentList compact items={m.attachments} fetchFile={(aid, inline) => marvflowService.attachmentFile(id, aid, inline)} />
                  <div className="inv-msg-bubble__time">{new Date(m.created_at).toLocaleString()}</div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <AttachmentStatus att={att} disabled={sending} />
            <form onSubmit={handleReply} style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--gray-200)' }}>
              <AttachmentButton id="marvflow-reply-attachment" onPick={att.pick} disabled={sending} />
              <input
                className="form-control" placeholder="Type a reply…" disabled={sending}
                value={body} onChange={e => setBody(e.target.value)} style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary btn-sm" disabled={sending || !body.trim()}>
                {sending ? <span className="spinner" /> : <FiSend size={14} />}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT — controls + activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="adm-card">
            <h3 className="adm-card__title">Manage Request</h3>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-control" value={data.status} onChange={e => handleStatusChange(e.target.value)}>
                <option value="new">New</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_for_info">Waiting for Information</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Priority {!isLead && <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>(Team Lead only)</span>}</label>
              <select className="form-control" value={data.priority} disabled={!isLead} onChange={e => handlePriorityChange(e.target.value)}>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Assigned To</label>
              {isLead ? (
                <select className="form-control" value={data.assigned_to_id || ''} onChange={e => handleAssign(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">Unassigned</option>
                  {team.map(t => <option key={t.id} value={t.id}>{t.name}{t.id === user.id ? ' (You)' : ''}</option>)}
                </select>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.88rem', color: 'var(--gray-700)' }}>
                    {data.assigned_to || 'Unassigned'}
                  </span>
                  {!data.assigned_to_id && (
                    <button className="btn btn-ghost btn-sm" onClick={() => handleAssign(user.id)}>Assign to me</button>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <span className={`badge badge-${PRIORITY_BADGE[data.priority]}`}>{data.priority}</span>
              <span className={`badge badge-${STATUS_BADGE[data.status]}`}>{data.status.replace(/_/g, ' ')}</span>
            </div>
          </div>

          <div className="adm-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <FiClock size={14} style={{ color: 'var(--gray-400)' }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Activity History
              </span>
            </div>
            {data.activity.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--gray-400)' }}>No activity yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {data.activity.map(a => (
                  <div key={a.id} style={{ fontSize: '0.8rem', color: 'var(--gray-600)', paddingBottom: '0.6rem', borderBottom: '1px solid var(--gray-100)' }}>
                    <strong>{a.actor_name}</strong> {a.action.replace(/_/g, ' ')}
                    {a.from_value && a.to_value && <> — {a.from_value} → {a.to_value}</>}
                    {a.note && <div style={{ color: 'var(--gray-400)', marginTop: 2 }}>{a.note}</div>}
                    <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 2 }}>{new Date(a.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
