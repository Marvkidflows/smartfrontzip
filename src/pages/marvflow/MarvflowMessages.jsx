// LOCATION: src/pages/marvflow/MarvflowMessages.jsx
//
// MarvFlow → SSI communication. Three clearly separate entry points on one page:
//   • Compose Email   — formal: recipient (SSI Admin / Financial Team), subject, rich-text body (Management's email interface)
//   • Message Admin   — quick, informal note to the SSI Admin: one text box, no subject, shown as a conversation history
//   • Sent            — everything this user sent (emails + quick messages) with a full reading view
// Delivery is real: each POST saves the row the SSI inbox endpoints read. "Sent" is shown ONLY after the server confirms the
// save, "Read" ONLY when the server reports a recipient-role user opened it, and every retry reuses the same idempotency
// token so a retry after a timeout can never duplicate. Nothing here claims delivery to a phone or an email address.
import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import safeHtml from '../../utils/safeHtml';
import { FiSend, FiMail, FiArrowLeft, FiAlertCircle, FiCheckCircle, FiTrash2, FiMessageCircle, FiRefreshCw } from 'react-icons/fi';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { marvflowService } from '../../services/api';
import MarvflowRichEditor from '../../components/MarvflowRichEditor';
import MarvflowThread from '../../components/MarvflowThread';
import '../admin/AdminPages.css';
import '../../components/MarvflowRichEditor.css';
import '../../components/MarvflowThread.css';
import './MarvflowMessages.css';

const newToken = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`).slice(0, 64);
const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : '');
const DIRECT_MAX = 2000;

// Same wording everywhere a MarvFlow messaging request is refused because the account is not active.
const restrictedMsg = (err) => (err?.response?.data?.code === 'account_restricted' ? err.response.data.message : null);

function describeSendError(err) {
  if (!err.response) {
    return 'We could not confirm delivery (network problem or timeout). Your message was NOT marked as sent. You can press Send again — if it did arrive, it will not be duplicated.';
  }
  const { status, data } = err.response;
  if (status === 422) return data?.errors ? Object.values(data.errors).flat()[0] : (data?.message || 'Please check the form.');
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (data?.code === 'account_restricted') return data.message;                      // account suspended/frozen/…: messaging is unavailable
  if (status === 403) return 'You are not authorised to send messages.';
  if (status === 429) return 'You are sending too quickly. Please wait a moment and try again.';
  return data?.message || 'The message could not be sent. Nothing was delivered. Please try again.';
}

export default function MarvflowMessages({ initialTab = 'compose' }) {
  const [sp] = useSearchParams();
  const threadParam = sp.get('thread');                      // set by the bell notification: open that conversation
  const [tab, setTab] = useState(threadParam ? 'sent' : initialTab);
  useEffect(() => setTab(threadParam ? 'sent' : initialTab), [initialTab, threadParam]);

  const tabs = [['compose', 'Compose Email', FiMail], ['direct', 'Message Admin', FiMessageCircle], ['sent', 'Sent', FiSend]];
  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div>
          <h1>Messages to SSI</h1>
          <p style={{ color: 'var(--gray-500)', margin: 0 }}>Write a formal email to SSI, or send the Admin a quick message.</p>
        </div>
      </div>
      <div className="mfm-tabs" role="tablist" aria-label="Messaging">
        {tabs.map(([k, label, Icon]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`btn btn-sm ${tab === k ? 'btn-primary' : 'btn-ghost'}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>
      {tab === 'compose' && <ComposeEmail onSent={() => setTab('sent')} />}
      {tab === 'direct' && <MessageAdmin />}
      {tab === 'sent' && <Sent openId={threadParam} />}
    </div>
  );
}

// ── Compose Email ────────────────────────────────────────────────────────────
function ComposeEmail({ onSent }) {
  const [recipients, setRecipients] = useState(null);
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(null);      // the message the SERVER confirmed as saved
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const token = useRef(newToken());                       // one token per compose; reused on retries, renewed only after a confirmed send

  const dirty = !!(recipient || subject.trim() || text);

  useEffect(() => {
    marvflowService.getMessageRecipients().then((r) => setRecipients(r.data.recipients)).catch(() => setError('Could not load the recipient list. Please refresh.'));
  }, []);

  // Warn before closing the tab with an unsent draft (no server-side drafts exist, so it would be lost).
  useEffect(() => {
    if (!dirty || sending) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, sending]);

  const reset = () => { setRecipient(''); setSubject(''); setHtml(''); setText(''); setEditorKey((k) => k + 1); setError(''); token.current = newToken(); };

  const send = async (e) => {
    e.preventDefault();
    if (sending) return;                                   // no double submit
    if (!recipient) return setError('Choose who this message is for.');
    if (subject.trim().length < 3) return setError('Please enter a subject (at least 3 characters).');
    if (!text) return setError('The message is empty.');

    setSending(true); setError(''); setConfirmed(null);
    try {
      const res = await marvflowService.sendMessage({ recipient, subject: subject.trim(), body: html, client_token: token.current });
      setConfirmed({ ...res.data.message, duplicate: res.data.duplicate });        // success is shown only from the server's answer
      toast.success(res.data.duplicate ? 'This message had already been sent.' : 'Message sent.');
      reset();
    } catch (err) {
      setError(describeSendError(err));                    // keep the form AND the token: Send again is a safe retry
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={send} className="adm-card mfm-card" noValidate>
      {confirmed && (
        <div role="status" className="mfm-banner mfm-banner--ok">
          <FiCheckCircle size={18} />
          <div style={{ minWidth: 0 }}>
            <strong>{confirmed.status_label}</strong>
            <div className="mfm-muted" style={{ overflowWrap: 'anywhere' }}>“{confirmed.subject}” · {fmt(confirmed.sent_at)}</div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onSent} style={{ marginTop: 4, minHeight: 36 }}>View in Sent</button>
          </div>
        </div>
      )}
      {error && <div role="alert" className="mfm-banner mfm-banner--err"><FiAlertCircle size={18} /><span>{error}</span></div>}

      <fieldset disabled={sending} className="mfm-fieldset">
        <legend>To</legend>
        <div className="mfm-recipients">
          {(recipients || []).map((r) => (
            <label key={r.key} className={`mfm-recipient${recipient === r.key ? ' is-on' : ''}${r.available ? '' : ' is-off'}`}>
              <input type="radio" name="recipient" value={r.key} checked={recipient === r.key} disabled={!r.available} onChange={() => setRecipient(r.key)} />
              <span><strong>{r.label}</strong>{!r.available && <span className="mfm-muted" style={{ display: 'block' }}>No active account yet — cannot receive messages</span>}</span>
            </label>
          ))}
          {recipients === null && <span className="mfm-muted">Loading recipients…</span>}
        </div>

        <label htmlFor="mfm-subject" className="mfm-label">Subject</label>
        <input id="mfm-subject" className="form-control" style={{ margin: '4px 0 1rem' }} value={subject} maxLength={150}
          onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Currency policy checklist" />

        <div className="mfm-label">Message</div>
        <MarvflowRichEditor key={editorKey} value={html} onChange={(h, t) => { setHtml(h); setText(t); }} disabled={sending} />
      </fieldset>

      {confirmDiscard ? (
        <div role="alertdialog" aria-label="Discard this message?" className="mfm-banner mfm-banner--warn" style={{ marginTop: '1rem' }}>
          <span style={{ flex: 1 }}>Discard this message? Nothing has been sent and it cannot be recovered.</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmDiscard(false)}>Keep editing</button>
          <button type="button" className="btn btn-sm mfm-danger" onClick={() => { reset(); setConfirmDiscard(false); }}>Discard</button>
        </div>
      ) : (
        <div className="mfm-actions">
          <button type="button" className="btn btn-ghost" disabled={sending || !dirty} onClick={() => setConfirmDiscard(true)}><FiTrash2 size={14} /> Discard</button>
          <button type="submit" className="btn btn-primary" disabled={sending} style={{ minWidth: 140 }}>
            {sending ? <><span className="spinner" /> Sending…</> : <><FiSend size={14} /> Send</>}
          </button>
        </div>
      )}
    </form>
  );
}

// ── Message Admin (quick, informal) ──────────────────────────────────────────
function MessageAdmin() {
  const [items, setItems] = useState(null);             // newest first from the server; shown oldest → newest like a chat
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [startNew, setStartNew] = useState(false);          // the user explicitly chose to begin a separate conversation
  const token = useRef(newToken());
  const endRef = useRef(null);

  const load = useCallback((p = 1, replace = true) => {
    setLoadError('');
    return marvflowService.getMessages(p, 'direct')
      .then((r) => {
        setLastPage(r.data.meta.last_page);
        setItems((cur) => (replace || !cur ? r.data.data : [...cur, ...r.data.data.filter((n) => !cur.some((o) => o.id === n.id))]));
      })
      .catch((err) => { setItems((cur) => cur || []); setLoadError(restrictedMsg(err) || 'Could not load your conversation. Please try again.'); });
  }, []);

  useEffect(() => { load(1, true); }, [load]);

  // Read receipts are tracked by the server; refresh quietly while the tab is open so "Read by …" appears.
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible' && page === 1) load(1, true); }, 30000);
    return () => clearInterval(t);
  }, [load, page]);

  const send = async (e) => {
    e?.preventDefault();
    if (sending) return;
    const text = body.trim();
    if (!text) return setError('Please type a message.');
    if (text.length > DIRECT_MAX) return setError(`Quick messages are limited to ${DIRECT_MAX} characters. Use Compose Email for longer messages.`);

    setSending(true); setError('');
    try {
      // The SERVER decides which conversation this belongs to: consecutive quick messages stay in one running conversation (before and
      // after SSI replies). Only an explicit "Start a new conversation" asks for a separate one.
      const res = await marvflowService.sendDirectMessage({ body: text, client_token: token.current, ...(startNew ? { new_conversation: true } : {}) });
      const saved = res.data.message;                              // only the server's confirmed record is added to the history
      setItems((cur) => [saved, ...(cur || []).filter((m) => m.id !== saved.id)]);
      setStartNew(false);
      setBody(''); token.current = newToken();
      setTimeout(() => endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' }), 50);
    } catch (err) {
      setError(describeSendError(err));                            // text and token kept: pressing Send again is a safe retry
    } finally {
      setSending(false);
    }
  };

  const ordered = items ? [...items].reverse() : [];

  return (
    <div className="adm-card mfm-card mfm-chat">
      <div className="mfm-chat__head">
        <div><strong>SSI System Admin</strong><div className="mfm-muted">Quick messages go to every active SSI Admin, and their replies appear here. For a formal message with a subject and formatting, use Compose Email.</div></div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => load(1, true)} aria-label="Refresh conversation"><FiRefreshCw size={14} /></button>
      </div>

      <div className="mfm-chat__list" aria-live="polite">
        {lastPage > page && (
          <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'center' }} onClick={() => { const n = page + 1; setPage(n); load(n, false); }}>Load older messages</button>
        )}
        {loadError && <div role="alert" className="mfm-banner mfm-banner--err"><FiAlertCircle size={16} /><span>{loadError}</span></div>}
        {items === null && <div className="mfm-muted" style={{ textAlign: 'center' }}>Loading…</div>}
        {items && ordered.length === 0 && !loadError && (
          <div className="mfm-empty"><FiMessageCircle size={30} /><p>No quick messages yet. Ask a question or raise an issue below.</p></div>
        )}
        {ordered.map((m, i) => (
          <Fragment key={m.id}>
          {i > 0 && m.thread_id !== ordered[i - 1].thread_id && <div className="mfm-divider" role="separator"><span>New conversation</span></div>}
          <div className={`mfm-bubble${m.from === 'ssi' ? ' mfm-bubble--ssi' : ''}`}>
            <div className="mfm-bubble__text mfm-body" dangerouslySetInnerHTML={{ __html: safeHtml(m.body_html) }} />
            <div className="mfm-bubble__meta">
              {m.from === 'ssi'
                ? <>{m.sender_name || 'SSI'} · {fmt(m.sent_at)}</>
                : <>{fmt(m.sent_at)} · <span className={m.status === 'read' ? 'mfm-read' : ''}>{m.status === 'read' ? m.status_label : 'Sent'}</span></>}
            </div>
          </div>
          </Fragment>
        ))}
        <div ref={endRef} />
      </div>

      {error && <div role="alert" className="mfm-banner mfm-banner--err"><FiAlertCircle size={16} /><span>{error}</span></div>}
      {startNew && (
        <div className="mfm-banner mfm-banner--info" role="status">
          <span>Your next message will start a <strong>new conversation</strong>.</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStartNew(false)}>Cancel</button>
        </div>
      )}
      <form onSubmit={send} className="mfm-chat__form">
        <label htmlFor="mfm-direct" className="mfm-sr">Message to the SSI Admin</label>
        <textarea id="mfm-direct" className="form-control" rows={3} value={body} disabled={sending} maxLength={DIRECT_MAX + 200}
          onChange={(e) => setBody(e.target.value)} placeholder="Type a quick message to the Admin…"
          onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') send(e); }} />
        <div className="mfm-chat__bar">
          <span className={`mfm-muted${body.length > DIRECT_MAX ? ' mfm-over' : ''}`}>{body.length}/{DIRECT_MAX} · Ctrl+Enter to send</span>
          {!startNew && ordered.length > 0 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStartNew(true)} disabled={sending}>Start a new conversation</button>}
          <button type="submit" className="btn btn-primary" disabled={sending || !body.trim()}>
            {sending ? <><span className="spinner" /> Sending…</> : <><FiSend size={14} /> Send</>}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Sent (emails + quick messages) ───────────────────────────────────────────
function Sent({ openId = null }) {
  const [rows, setRows] = useState(null);
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState('');
  const [meta, setMeta] = useState({ last_page: 1 });
  const [open, setOpen] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    marvflowService.getMessages(page, kind).then((r) => { setRows(r.data.data); setMeta(r.data.meta); })
      .catch((err) => { setRows([]); setError(restrictedMsg(err) || 'Could not load your sent messages. Please try again.'); });
  }, [page, kind]);
  useEffect(() => { load(); }, [load]);

  const view = useCallback(async (id) => {
    try { const { message, thread } = (await marvflowService.showMessage(id)).data; setOpen({ message, thread }); }   // the server marks SSI's replies read here
    catch { toast.error('Could not open this conversation.'); }
  }, []);
  useEffect(() => { if (openId) view(openId); }, [openId, view]);

  const sendReply = async (data) => {
    const res = await marvflowService.replyMessage(open.message.id, data);       // throws on failure → the thread keeps the text
    setOpen({ message: res.data.message, thread: res.data.thread });
    toast.success(res.data.duplicate ? 'This reply had already been sent.' : 'Reply sent.');
  };

  if (open) {
    const m = open.message;
    return (
      <div className="adm-card mfm-card">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setOpen(null); load(); }}><FiArrowLeft size={14} /> Back to Sent</button>
        <h2 className="mfm-title">{m.subject}</h2>
        <div className="mfm-muted">To {m.recipient_label} · {m.kind_label} · {fmt(m.sent_at)}</div>
        <div style={{ margin: '0.5rem 0 1rem' }}><span className={`badge badge-${m.status === 'read' ? 'success' : 'info'}`}>{m.status_label}</span></div>
        <MarvflowThread items={open.thread} kind={m.kind} onSend={sendReply} />
      </div>
    );
  }

  return (
    <div className="adm-card">
      <div className="mfm-filters" role="group" aria-label="Filter sent messages">
        {[['', 'All'], ['email', 'Emails'], ['direct', 'Quick messages']].map(([k, label]) => (
          <button key={k || 'all'} type="button" aria-pressed={kind === k} className={`btn btn-sm ${kind === k ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setKind(k); setPage(1); }}>{label}</button>
        ))}
      </div>
      {error && <div role="alert" className="mfm-banner mfm-banner--err" style={{ margin: '0 1rem' }}><FiAlertCircle size={16} /><span>{error}</span></div>}
      {rows === null && <div className="adm-empty">Loading…</div>}
      {rows && rows.length === 0 && !error && <div className="adm-empty"><FiMail size={32} /><p>{kind ? 'Nothing here yet.' : 'You have not sent any messages yet.'}</p></div>}
      {rows && rows.map((m) => (
        <button key={m.id} type="button" onClick={() => view(m.id)} className="mfm-row">
          <div className="mfm-row__top">
            <strong style={{ overflowWrap: 'anywhere' }}>{m.subject}</strong>
            <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span className="badge badge-warning">{m.kind_label}</span>
              {m.unread_replies > 0 && <span className="badge badge-danger">{m.unread_replies} new {m.unread_replies === 1 ? 'reply' : 'replies'}</span>}
              {m.reply_count > 0 && <span className="badge badge-info">{m.reply_count} {m.reply_count === 1 ? 'message' : 'messages'} in thread</span>}
              {m.from === 'ssi'
                ? <span className={`badge badge-${m.is_read ? 'success' : 'danger'}`}>{m.is_read ? 'Reply' : 'New reply'}</span>
                : <span className={`badge badge-${m.status === 'read' ? 'success' : 'info'}`}>{m.status === 'read' ? 'Read' : 'Sent'}</span>}
            </span>
          </div>
          <div className="mfm-muted">{m.from === 'ssi' ? `From ${m.sender_name || m.recipient_label}` : `To ${m.recipient_label}`} · {fmt(m.last_activity || m.sent_at)}</div>
          <div className="mfm-preview">{m.preview}</div>
        </button>
      ))}
      {meta.last_page > 1 && (
        <div className="mfm-pager">
          <button type="button" className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span>Page {page} of {meta.last_page}</span>
          <button type="button" className="btn btn-ghost btn-sm" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
