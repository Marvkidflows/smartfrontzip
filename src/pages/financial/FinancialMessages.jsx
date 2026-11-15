// LOCATION: src/pages/financial/FinancialMessages.jsx
//
// Financial Team communication centre. Reuses the msg-layout pattern from
// AdminMessages.jsx (list + thread) and adds two tabs on top of it for the
// brief's "official communication to multiple recipients" and "News Centre
// notice" requirements — all three surfaces hit the SAME extended
// `messages`/`announcements` tables, not a parallel system.
import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiSend, FiMail, FiUsers, FiFileText, FiSearch, FiInbox, FiLifeBuoy } from 'react-icons/fi';
import { financialService } from '../../services/api';
// The existing admin Email Center, reused as-is (see the `service` prop) —
// same compose / bulk / templates / logs UI, Financial-scoped endpoints.
import AdminEmailCenter from '../admin/AdminEmailCenter';
// The existing Admin <-> Financial shared channel.
import StaffChannel from '../shared/StaffChannel';
import toast from 'react-hot-toast';
import RichComposer from '../../components/RichComposer';
import RichText from '../../components/RichText';
import '../admin/AdminPages.css';
import { NameWithRank } from '../../components/RankBadge';
import './FinancialPages.css';

const IDENTITY = 'Smart System Investment — Financial Team';

function Inbox({ openInvestorId }) {
  const [conversations, setConversations] = useState([]);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(null); // investor id
  const [thread, setThread] = useState(null);
  const [body, setBody] = useState('');          // formatted message (HTML)
  const [bodyText, setBodyText] = useState('');  // plain-text form (empty check)
  const [subject, setSubject] = useState('');
  const [sending, setSending] = useState(false);
  const [alsoEmail, setAlsoEmail] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadList = useCallback(() => {
    setLoading(true);
    financialService.getMessages({ q: q || undefined }).then(res => setConversations(res.data.conversations || []))
      .catch(() => toast.error('Failed to load mailbox')).finally(() => setLoading(false));
  }, [q]);
  useEffect(() => { loadList(); }, [loadList]);

  const openThread = useCallback((investorId) => {
    setActive(investorId);
    financialService.showThread(investorId).then(res => {
      setThread(res.data);
      setConversations(cs => cs.map(c => c.investor.id === investorId ? { ...c, unread_count: 0 } : c));
    }).catch(() => toast.error('Failed to open conversation'));
  }, []);

  // Deep link from an investor's profile: open that investor's thread directly.
  useEffect(() => { if (openInvestorId) openThread(openInvestorId); }, [openInvestorId, openThread]);

  const send = async () => {
    if (!bodyText.trim()) return;
    setSending(true);
    try {
      const res = await financialService.sendMessage(active, { subject: subject || undefined, body_html: body, also_email: alsoEmail || undefined });
      setThread(t => ({ ...t, thread: [...t.thread, res.data.data] }));
      setSubject(''); setBody(''); setBodyText('');
      // The in-app message is always saved; report the email copy separately.
      const em = res.data.email;
      if (em?.status === 'sent') toast.success('Message sent and a copy was emailed to the investor.');
      else if (em?.status === 'failed') toast.error(`Message sent in-app, but the email copy failed: ${em.error || 'unknown error'}`, { duration: 7000 });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to send'); }
    finally { setSending(false); }
  };

  return (
    <div className="fin-mail">
      <div>
        <div className="adm-search" style={{ marginBottom: '0.75rem' }}>
          <FiSearch /><input placeholder="Search investor or subject…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div className="fin-mail__list">
          {loading ? <div style={{ color: 'var(--gray-400)', padding: '1rem' }}>Loading…</div>
            : conversations.length === 0 ? <div className="adm-empty"><p>No correspondence yet.</p></div>
            : conversations.map(c => (
              <button key={c.investor.id} className={`fin-mail__item ${active === c.investor.id ? 'active' : ''}`} onClick={() => openThread(c.investor.id)}>
                <div className="top">
                  <span className="name"><NameWithRank name={c.investor.name} rank={c.investor.rank} /></span>
                  {c.unread_count > 0 && <span className="fin-unread-dot">{c.unread_count}</span>}
                </div>
                <div className="prev">{c.last_message.subject ? `${c.last_message.subject}: ` : ''}{c.last_message.preview}</div>
                <div className="time">{new Date(c.last_message.created_at).toLocaleString()}</div>
              </button>
            ))}
        </div>
      </div>

      <div className="adm-card" style={{ minHeight: 420 }}>
        {!thread ? (
          <div className="adm-empty"><p>Select a conversation to view correspondence.</p></div>
        ) : (
          <>
            <h3 className="adm-card__title"><NameWithRank name={thread.investor.name} rank={thread.investor.rank} size="md" /> <span style={{ fontWeight: 400, color: 'var(--gray-400)', fontSize: '0.8rem' }}>{thread.investor.email}</span></h3>
            <div className="fin-thread">
              {thread.thread.map(m => (
                <div key={m.id} className={`fin-msg fin-msg--${m.from}`}>
                  <div className="fin-msg__head">
                    <span>{m.from === 'investor' ? <NameWithRank name={thread.investor.name} rank={thread.investor.rank} /> : m.sender}</span>
                    {m.kind === 'notice' && <span className="fin-unread-dot" style={{ background: 'var(--gold)' }}>Notice</span>}
                  </div>
                  {m.subject && <div className="fin-msg__subject">{m.subject}</div>}
                  <RichText className="fin-msg__body" html={m.body_html} text={m.body} />
                  <div className="fin-msg__foot">
                    <span>{new Date(m.created_at).toLocaleString()}</span>
                    <span>{m.status}</span>
                    {m.sent_by && <span>by {m.sent_by}</span>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input className="form-control" placeholder="Subject (optional)" value={subject} onChange={e => setSubject(e.target.value)} />
              <RichComposer
                value={body}
                onChange={(html, text) => { setBody(html); setBodyText(text); }}
                onSend={send}
                sending={sending}
                placeholder="Reply as the Financial Team…"
                footer={(
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={alsoEmail} onChange={e => setAlsoEmail(e.target.checked)} /> Also send a copy by email
                  </label>
                )}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BroadcastComposer({ onSent }) {
  const [scope, setScope] = useState('all');
  const [investors, setInvestors] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');          // formatted message (HTML)
  const [bodyText, setBodyText] = useState('');  // plain-text form (empty check)
  const [kind, setKind] = useState('notice');
  const [alsoEmail, setAlsoEmail] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (scope === 'selected' && investors.length === 0) {
      financialService.getInvestors().then(res => setInvestors(res.data.users || [])).catch(() => {});
    }
  }, [scope, investors.length]);

  const toggle = (id) => setSelectedIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);

  const send = async () => {
    if (!subject.trim() || !bodyText.trim()) { toast.error('Subject and message are required.'); return; }
    if (scope === 'selected' && selectedIds.length === 0) { toast.error('Select at least one investor.'); return; }
    setSending(true);
    try {
      const res = await financialService.broadcast({ scope, investor_ids: scope === 'selected' ? selectedIds : undefined, subject, body_html: body, kind, also_email: alsoEmail || undefined });
      toast.success(res.data.message, { duration: alsoEmail ? 7000 : 4000 });
      setSubject(''); setBody(''); setBodyText(''); setSelectedIds([]);
      onSent?.();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to send.'); }
    finally { setSending(false); }
  };

  return (
    <div className="adm-card">
      <h3 className="adm-card__title">Official Communication to Multiple Investors</h3>
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
          <input type="radio" checked={scope === 'all'} onChange={() => setScope('all')} /> All investors
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
          <input type="radio" checked={scope === 'selected'} onChange={() => setScope('selected')} /> Selected investors
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
          <input type="checkbox" checked={kind === 'notice'} onChange={e => setKind(e.target.checked ? 'notice' : 'message')} /> Mark as Official Notice
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
          <input type="checkbox" checked={alsoEmail} onChange={e => setAlsoEmail(e.target.checked)} /> Also send a copy by email
        </label>
      </div>

      {scope === 'selected' && (
        <div className="fin-picker" style={{ marginBottom: '1rem' }}>
          {investors.map(i => (
            <label key={i.id}><input type="checkbox" checked={selectedIds.includes(i.id)} onChange={() => toggle(i.id)} /><NameWithRank name={i.name} rank={i.rank} /> <span style={{ color: 'var(--gray-400)' }}>({i.email})</span></label>
          ))}
        </div>
      )}

      <div className="form-group"><label className="form-label">Subject</label><input className="form-control" value={subject} onChange={e => setSubject(e.target.value)} /></div>
      <div className="form-group"><label className="form-label">Message</label>
        <RichComposer value={body} onChange={(html, text) => { setBody(html); setBodyText(text); }} onSend={send} sending={sending} hideSend placeholder="Write the communication…" />
      </div>
      <div className="fin-identity"><FiUsers size={13} /> From: {IDENTITY}</div>
      <div style={{ marginTop: '1rem' }}>
        <button className="btn btn-primary" onClick={send} disabled={sending}>{sending ? <span className="spinner" /> : 'Send Communication'}</button>
      </div>
    </div>
  );
}

function BroadcastHistory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { financialService.getBroadcasts().then(res => setRows(res.data.data || [])).finally(() => setLoading(false)); }, []);

  return (
    <div className="adm-card">
      <h3 className="adm-card__title">Sent Communications</h3>
      {loading ? <div style={{ color: 'var(--gray-400)' }}>Loading…</div>
        : rows.length === 0 ? <div className="adm-empty"><p>No communications sent yet.</p></div>
        : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Subject</th><th>Kind</th><th>Issued By</th><th>Recipients</th><th>Read</th><th>Sent</th></tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.broadcast_id}>
                    <td>{r.subject}</td>
                    <td><span className={`badge badge-${r.kind === 'notice' ? 'info' : 'default'}`}>{r.kind}</span></td>
                    <td>{r.issued_by}</td>
                    <td>{r.recipients}</td>
                    <td>{r.read_count}/{r.recipients}</td>
                    <td style={{ fontSize: '0.82rem' }}>{new Date(r.sent_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

function NewsNotices() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    financialService.getNotices().then(res => setNotices(res.data.notices || [])).catch(() => toast.error('Failed to load notices')).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const publish = async () => {
    if (!title.trim() || !content.trim()) { toast.error('Title and content are required.'); return; }
    setSaving(true);
    try {
      await financialService.storeNotice({ title, content, status: 'published' });
      toast.success('Notice published to the News Centre.');
      setTitle(''); setContent(''); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to publish.'); }
    finally { setSaving(false); }
  };

  const unpublish = async (id) => {
    try { await financialService.unpublishNotice(id); toast.success('Notice unpublished.'); load(); }
    catch { toast.error('Failed to unpublish.'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="adm-card">
        <h3 className="adm-card__title">Publish a Financial Team Notice</h3>
        <div className="form-group"><label className="form-label">Title</label><input className="form-control" value={title} onChange={e => setTitle(e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Content</label><textarea className="form-control" rows={5} value={content} onChange={e => setContent(e.target.value)} style={{ resize: 'vertical' }} /></div>
        <div className="fin-identity"><FiFileText size={13} /> Category: Financial Team Notice</div>
        <div style={{ marginTop: '1rem' }}><button className="btn btn-primary" onClick={publish} disabled={saving}>{saving ? <span className="spinner" /> : 'Publish to News Centre'}</button></div>
      </div>

      <div className="adm-card">
        <h3 className="adm-card__title">Published Notices</h3>
        {loading ? <div style={{ color: 'var(--gray-400)' }}>Loading…</div>
          : notices.length === 0 ? <div className="adm-empty"><p>No notices published yet.</p></div>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {notices.map(n => (
                <div key={n.id} className="fin-audit-card">
                  <div className="fin-audit-card__head"><strong>{n.title}</strong><span className={`badge badge-${n.status === 'published' ? 'success' : 'default'}`}>{n.status}</span></div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--gray-600)' }}>{n.summary || n.content.slice(0, 140)}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>By {n.issued_by} · {n.published_at ? new Date(n.published_at).toLocaleString() : '—'}</span>
                    {n.status === 'published' && <button className="btn btn-ghost btn-sm" onClick={() => unpublish(n.id)}>Unpublish</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

export default function FinancialMessages() {
  const location = useLocation();
  // Other pages can deep-link here: { tab, openInvestor } (investor profile
  // "Message" button) or { prefillInvestor } (investor profile "Send Email",
  // consumed by the Email Center's compose tab).
  const initialTab = location.state?.prefillInvestor ? 'email' : (location.state?.tab || 'inbox');
  const [tab, setTab] = useState(initialTab);
  const openInvestorId = location.state?.openInvestor || null;
  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div><h1>Mail</h1><p>Message and email investors as the Financial Team, issue official notices, receive internal communications, and review correspondence history</p></div>
      </div>

      <div className="fin-tabs">
        {[['inbox', 'Inbox', FiInbox], ['email', 'Email Center', FiMail], ['broadcast', 'Official Communication', FiUsers], ['history', 'Sent History', FiFileText], ['notices', 'News Centre Notices', FiFileText], ['internal', 'Internal Teams', FiLifeBuoy]].map(([key, label, Icon]) => (
          <button key={key} className={`btn btn-sm ${tab === key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(key)}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {tab === 'inbox' && <Inbox openInvestorId={openInvestorId} />}
      {tab === 'email' && <AdminEmailCenter service={financialService} embedded />}
      {tab === 'broadcast' && <BroadcastComposer onSent={() => setTab('history')} />}
      {tab === 'history' && <BroadcastHistory />}
      {tab === 'notices' && <NewsNotices />}
      {tab === 'internal' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="adm-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
              Communications from the Admin team appear below. For the Technical / Development team, use your request threads.
            </span>
            <Link to="/financial/dev-requests" className="btn btn-ghost btn-sm"><FiLifeBuoy size={13} /> Development Team requests</Link>
          </div>
          <StaffChannel embedded />
        </div>
      )}
    </div>
  );
}
