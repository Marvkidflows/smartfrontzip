// LOCATION: src/components/MarvflowThread.jsx
//
// One conversation between the MarvFlow team and SSI: every message in order (oldest first) and a reply box. Used on BOTH
// sides — the MarvFlow "Sent" page and the SSI Admin / Financial inbox — so a conversation looks and behaves the same.
// The server decides who may read/reply and who the reply is addressed to; this component only sends { body, client_token }.
// "Sent" is shown only from the server's answer; a failed send keeps the text AND the token so pressing Send again is a
// safe retry (the server will not save it twice).
import { useState, useRef } from 'react';
import safeHtml from '../utils/safeHtml';
import { FiSend, FiAlertCircle } from 'react-icons/fi';
import MarvflowRichEditor from './MarvflowRichEditor';
import './MarvflowRichEditor.css';
import './MarvflowThread.css';

const DIRECT_MAX = 2000;
const newToken = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`).slice(0, 64);
const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : '');

export function describeReplyError(err) {
  if (!err.response) return 'We could not confirm delivery (network problem or timeout). Your reply was NOT marked as sent. You can press Send again — if it did arrive, it will not be duplicated.';
  const { status, data } = err.response;
  if (data?.code === 'account_restricted') return data.message;
  if (status === 409 && data?.code === 'owner_restricted') return data.message;
  if (status === 403 && data?.message) return data.message;
  if (status === 422) return data?.errors ? Object.values(data.errors).flat()[0] : (data?.message || 'Please check your reply.');
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'You are not authorised to reply here.';
  if (status === 404) return 'This conversation is no longer available.';
  if (status === 429) return 'You are sending too quickly. Please wait a moment and try again.';
  return data?.message || 'The reply could not be sent. Nothing was delivered. Please try again.';
}

/**
 * items   — the conversation from the server (oldest first)
 * kind    — 'email' (rich text) | 'direct' (plain text, limited length)
 * onSend  — async ({ body, client_token, confirm_pending? }) => void ; must throw on failure
 * reply   — { allowed, pending, notice } from the server for THIS user and conversation. When the conversation's owner is restricted
 *           the server only lets an Admin reply, as PENDING DELIVERY, after an explicit confirmation shown here.
 */
export default function MarvflowThread({ items, kind = 'email', onSend, reply = { allowed: true, pending: false, notice: null } }) {
  const [html, setHtml] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [editorKey, setEditorKey] = useState(0);
  const [confirmed, setConfirmed] = useState(false);          // the Admin has read the pending-delivery warning
  const token = useRef(newToken());
  const direct = kind === 'direct';

  const send = async (e) => {
    e?.preventDefault();
    if (sending) return;
    const plain = direct ? text.trim() : text;
    if (!plain) return setError('Please type a reply.');
    if (reply.pending && !confirmed) return setError('Please tick the box to confirm that this reply will be stored as pending delivery.');
    if (direct && plain.length > DIRECT_MAX) return setError(`Quick messages are limited to ${DIRECT_MAX} characters.`);

    setSending(true); setError('');
    try {
      await onSend({ body: direct ? plain : html, client_token: token.current, ...(reply.pending ? { confirm_pending: true } : {}) });
      setHtml(''); setText(''); setConfirmed(false); setEditorKey((k) => k + 1); token.current = newToken();   // renewed only after a confirmed send
    } catch (err) {
      setError(describeReplyError(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mft">
      <div className="mft__list">
        {(items || []).map((m) => (
          <article key={m.id} className={`mft__msg mft__msg--${m.from === 'ssi' ? 'ssi' : 'mf'}`}>
            <header className="mft__head">
              <strong>{m.sender_name}</strong>
              <span className="mfm-muted">{m.sender_label} · {fmt(m.sent_at)}</span>
            </header>
            <div className="mfm-body mft__body" dangerouslySetInnerHTML={{ __html: safeHtml(m.body_html) }} />
            {m.pending_delivery && <div className="mft__pending" role="note">Pending delivery — stored, but the MarvFlow user cannot see it (and was not notified) until their account is active again.</div>}
            <footer className="mfm-muted">{m.is_read ? `Read${m.read_by ? ` by ${m.read_by}` : ''}${m.read_at ? ` · ${fmt(m.read_at)}` : ''}` : 'Sent — not opened yet'}</footer>
          </article>
        ))}
      </div>

      {!reply.allowed ? (
        <div className="mfm-banner mfm-banner--info mft__reply" role="note"><span>{reply.notice || 'You cannot reply to this conversation.'}</span></div>
      ) : (
      <form onSubmit={send} className="mft__reply" noValidate>
        <div className="mfm-label">Reply</div>
        {reply.pending && (
          <div role="alert" className="mfm-banner mfm-banner--warn">
            <FiAlertCircle size={16} />
            <div>
              <div>{reply.notice}</div>
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 8 }}>
                <input type="checkbox" checked={confirmed} disabled={sending} onChange={(e) => setConfirmed(e.target.checked)} />
                <span>I understand — store this reply as pending delivery.</span>
              </label>
            </div>
          </div>
        )}
        {error && <div role="alert" className="mfm-banner mfm-banner--err"><FiAlertCircle size={16} /><span>{error}</span></div>}
        {direct ? (
          <>
            <label htmlFor="mft-direct" className="mfm-sr">Your reply</label>
            <textarea id="mft-direct" className="form-control" rows={3} value={text} disabled={sending} maxLength={DIRECT_MAX + 200}
              onChange={(e) => setText(e.target.value)} placeholder="Write a reply…"
              onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') send(e); }} />
            <div className={`mfm-muted${text.length > DIRECT_MAX ? ' mfm-over' : ''}`}>{text.length}/{DIRECT_MAX} · Ctrl+Enter to send</div>
          </>
        ) : (
          <MarvflowRichEditor key={editorKey} value={html} onChange={(h, t) => { setHtml(h); setText(t); }} disabled={sending} />
        )}
        <div className="mfm-actions" style={{ justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={sending || !(direct ? text.trim() : text) || (reply.pending && !confirmed)} style={{ minWidth: 130 }}>
            {sending ? <><span className="spinner" /> Sending…</> : <><FiSend size={14} /> {reply.pending ? 'Store as pending' : 'Send reply'}</>}
          </button>
        </div>
      </form>
      )}
    </div>
  );
}
