// LOCATION: src/pages/shared/MarvflowInbox.jsx
//
// The SSI side of MarvFlow → SSI messages. ONE page mounted at /admin/marvflow-messages (Admin inbox) and
// /financial/marvflow-messages (Financial Team inbox); the service picks the prefix from the URL and the SERVER decides
// which inbox it is and whether this user may read it. Opening a message as a member of the addressed role records it as read.
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiMail, FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { marvflowInboxService } from '../../services/api';
import MarvflowThread from '../../components/MarvflowThread';
import '../admin/AdminPages.css';
import '../../components/MarvflowRichEditor.css';
import '../../components/MarvflowThread.css';
import '../marvflow/MarvflowMessages.css';

const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : '');

export default function MarvflowInbox() {
  const [rows, setRows] = useState(null);
  const [meta, setMeta] = useState({ last_page: 1 });
  const [unread, setUnread] = useState(0);
  const [label, setLabel] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);                 // { message, thread } — the whole conversation
  const [sp, setSp] = useSearchParams();                    // ?thread=<id> comes from the bell notification
  const [error, setError] = useState('');
  const [kind, setKind] = useState('');
  const [byKind, setByKind] = useState({ email: 0, direct: 0 });
  // Quick messages ("Message Admin") are addressed to the Admin role only, so only the Admin inbox needs the filter.
  const isAdminInbox = window.location.pathname.startsWith('/admin');

  const load = useCallback(() => {
    setError('');
    marvflowInboxService.list(page, kind)
      .then((r) => { setRows(r.data.data); setMeta(r.data.meta); setUnread(r.data.unread_count); setLabel(r.data.inbox_label); setByKind(r.data.unread_by_kind || { email: 0, direct: 0 }); })
      .catch((err) => { setRows([]); setError(err.response?.data?.code === 'account_restricted' ? err.response.data.message : (err.response?.status === 403 ? 'You do not have access to this inbox.' : 'Could not load messages. Please try again.')); });
  }, [page, kind]);
  useEffect(() => { load(); }, [load]);

  const view = useCallback(async (id) => {
    try { const { message, thread, reply } = (await marvflowInboxService.show(id)).data; setOpen({ message, thread, reply }); }   // the server marks it read here (only for the addressed role)
    catch (err) { toast.error(err.response?.status === 404 ? 'This message is not in your inbox.' : 'Could not open this message.'); }
  }, []);

  const threadParam = sp.get('thread');
  useEffect(() => { if (threadParam) view(threadParam); }, [threadParam, view]);

  const close = () => { setOpen(null); if (sp.get('thread')) setSp({}, { replace: true }); load(); };

  const sendReply = async (data) => {
    const res = await marvflowInboxService.reply(open.message.id, data);      // the server addresses it to the conversation's owner
    setOpen({ message: res.data.message, thread: res.data.thread, reply: res.data.reply });
    toast.success(res.data.duplicate ? 'This reply had already been sent.' : (res.data.pending_delivery ? 'Reply stored as pending delivery.' : 'Reply sent to MarvFlow.'));
  };

  if (open) {
    const m = open.message;
    return (
      <div className="adm-page">
        <div className="adm-card" style={{ padding: '1.25rem' }}>
          <button type="button" className="btn btn-ghost btn-sm" style={{ minHeight: 40 }} onClick={close}><FiArrowLeft size={14} /> Back to inbox</button>
          <h2 style={{ margin: '0.75rem 0 0.25rem', overflowWrap: 'anywhere' }}>{m.subject}</h2>
          <div style={{ color: 'var(--gray-500)', fontSize: '0.84rem', marginBottom: '1rem' }}>
            Started by <strong>{m.sender_name}</strong> (MarvFlow) · <span className="badge badge-warning">{m.kind_label}</span> · {fmt(m.sent_at)}
            {m.is_read && m.read_by ? ` · Read by ${m.read_by}` : ''}
          </div>
          <MarvflowThread items={open.thread} kind={m.kind} onSend={sendReply} reply={open.reply} />
        </div>
      </div>
    );
  }

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div>
          <h1>MarvFlow Messages</h1>
          <p style={{ color: 'var(--gray-500)', margin: 0 }}>{label ? `${label} inbox` : 'Messages from the MarvFlow team'}{unread > 0 ? ` · ${unread} unread` : ''}</p>
        </div>
      </div>
      <div className="adm-card">
        {isAdminInbox && (
          <div className="mfm-filters" role="group" aria-label="Filter messages">
            {[['', 'All', unread], ['email', 'Emails', byKind.email], ['direct', 'Quick messages', byKind.direct]].map(([k, label, n]) => (
              <button key={k || 'all'} type="button" aria-pressed={kind === k} className={`btn btn-sm ${kind === k ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setKind(k); setPage(1); }}>
                {label}{n > 0 ? ` (${n})` : ''}
              </button>
            ))}
          </div>
        )}
        {error && <div role="alert" style={{ padding: '0.75rem 1rem', color: 'var(--danger, #dc2626)' }}>{error}</div>}
        {rows === null && <div className="adm-empty">Loading…</div>}
        {rows && rows.length === 0 && !error && <div className="adm-empty"><FiMail size={32} /><p>No messages from MarvFlow yet.</p></div>}
        {rows && rows.map((m) => (
          <button key={m.id} type="button" onClick={() => view(m.id)} style={{ display: 'block', width: '100%', textAlign: 'left', background: m.is_read ? 'none' : 'var(--gray-50, #f8fafc)', border: 0, borderBottom: '1px solid var(--gray-200)', padding: '0.8rem 1rem', cursor: 'pointer', minHeight: 56 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <strong style={{ overflowWrap: 'anywhere', fontWeight: m.is_read ? 500 : 700 }}>{m.subject}</strong>
              <span style={{ display: 'flex', gap: 6 }}>
                <span className="badge badge-warning">{m.kind_label}</span>
                {m.reply_count > 0 && <span className="badge badge-info">{m.reply_count + 1} messages</span>}
                {!m.is_read && <span className="badge badge-info">{m.unread_count > 1 ? `${m.unread_count} new` : 'New'}</span>}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>From {m.sender_name} · {fmt(m.last_activity || m.sent_at)}</div>
            <div style={{ fontSize: '0.84rem', color: 'var(--gray-600)', overflowWrap: 'anywhere' }}>{m.preview}</div>
          </button>
        ))}
        {meta.last_page > 1 && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '0.75rem' }}>
            <button type="button" className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
            <span style={{ alignSelf: 'center', fontSize: '0.84rem' }}>Page {page} of {meta.last_page}</span>
            <button type="button" className="btn btn-ghost btn-sm" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
