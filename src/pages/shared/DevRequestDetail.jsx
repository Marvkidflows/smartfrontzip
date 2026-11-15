// LOCATION: src/pages/shared/DevRequestDetail.jsx
//
// MarvFlow Team Dashboard — SSI side thread view. Mirrors the bubble
// layout already used in InvestorMessages.jsx (bubble-me / bubble-admin
// pattern) so the conversation feels consistent with the rest of the
// app's messaging UI, just renamed for this context.
import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiSend, FiPaperclip } from 'react-icons/fi';
import { devRequestService } from '../../services/api';
import toast from 'react-hot-toast';
import { AttachmentButton, AttachmentStatus, AttachmentField, AttachmentList, ImageAttachmentLink, useAttachmentState, describeUploadError } from '../../components/TeamAttachments';
import '../admin/AdminPages.css';
import '../investor/InvestorMessages.css';

const PRIORITY_BADGE = { normal: 'info', high: 'warning', urgent: 'danger' };
const STATUS_BADGE = {
  new: 'info', acknowledged: 'warning', in_progress: 'warning',
  waiting_for_info: 'warning', resolved: 'success', closed: 'default',
};
const STATUS_LABEL = {
  new: 'New', acknowledged: 'Acknowledged', in_progress: 'In Progress',
  waiting_for_info: 'Waiting for Info', resolved: 'Resolved', closed: 'Closed',
};

export default function DevRequestDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const att = useAttachmentState();
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const basePath = window.location.pathname.startsWith('/financial') ? '/financial' : '/admin';

  const fetchRequest = () => {
    devRequestService.showRequest(id)
      .then(res => setData(res.data?.request))
      .catch(() => toast.error('Failed to load request'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRequest(); }, [id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [data?.messages?.length]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!body.trim() || sending) return;          // `sending` blocks duplicate submissions while an upload is in flight
    setSending(true);
    try {
      const form = new FormData();
      form.append('body', body.trim());
      if (att.file) { form.append('attachment', att.file); att.begin(); }
      const res = await devRequestService.reply(id, form, { onUploadProgress: att.onProgress });
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

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>Loading…</div>;
  if (!data) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--danger)' }}>Request not found</div>;

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to={`${basePath}/dev-requests`} className="btn btn-ghost btn-sm"><FiArrowLeft /> Back</Link>
          <div>
            <h1>{data.display_id} — {data.subject}</h1>
            <p>Submitted {new Date(data.created_at).toLocaleString()}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span className={`badge badge-${PRIORITY_BADGE[data.priority]}`}>{data.priority}</span>
          <span className={`badge badge-${STATUS_BADGE[data.status]}`}>{STATUS_LABEL[data.status]}</span>
        </div>
      </div>

      <div className="adm-card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
          Original Message
        </div>
        <p style={{ color: 'var(--gray-700)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{data.message}</p>
        <ImageAttachmentLink url={data.attachment_url} />
        <AttachmentList items={data.attachments} fetchFile={(aid, inline) => devRequestService.attachmentFile(id, aid, inline)} />
        {data.assigned_to && (
          <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginTop: '0.75rem' }}>
            Assigned to <strong>{data.assigned_to}</strong> on the MarvFlow team
          </div>
        )}
      </div>

      <div className="adm-card" style={{ display: 'flex', flexDirection: 'column', height: '55vh' }}>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.5rem' }}>
          {data.messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.85rem', margin: 'auto' }}>
              No replies yet. The MarvFlow team will respond here.
            </div>
          ) : data.messages.map(m => (
            <div key={m.id} className={`inv-msg-bubble ${m.sender_side === 'ssi' ? 'bubble-me' : 'bubble-admin'}`}>
              <div className="inv-msg-bubble__name">
                {m.sender_side === 'ssi' ? 'You' : `🛠️ ${m.sender_name} (MarvFlow)`}
              </div>
              <div className="inv-msg-bubble__text">{m.body}</div>
              <ImageAttachmentLink url={m.attachment_url} compact />
              <AttachmentList compact items={m.attachments} fetchFile={(aid, inline) => devRequestService.attachmentFile(id, aid, inline)} />
              <div className="inv-msg-bubble__time">{new Date(m.created_at).toLocaleString()}</div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <AttachmentStatus att={att} disabled={sending} />
        <form onSubmit={handleReply} style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--gray-200)' }}>
          <AttachmentButton id="dev-reply-attachment" onPick={att.pick} disabled={sending} />
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
  );
}
