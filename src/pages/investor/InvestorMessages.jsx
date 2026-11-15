import './InvestorMessages.css';
import { useState, useEffect, useRef } from 'react';
import { FiSend, FiMessageSquare, FiPlus } from 'react-icons/fi';
import { investorService } from '../../services/api';
import toast from 'react-hot-toast';
import RichComposer from '../../components/RichComposer';
import RichText from '../../components/RichText';

export default function InvestorMessages() {
  const [thread, setThread]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [sending, setSending]         = useState(false);
  const [body, setBody]               = useState('');   // formatted message (HTML)
  const [bodyText, setBodyText]       = useState('');   // plain-text form (empty check)
  const [subject, setSubject]         = useState('');
  const [department, setDepartment]   = useState('admin');
  const [showCompose, setShowCompose] = useState(false);
  const [unread, setUnread]           = useState(0);
  const bottomRef                     = useRef(null);

  const fetchThread = () => {
    investorService.getMessages()
      .then(res => {
        setThread(res.data?.thread || []);
        setUnread(res.data?.unread_count || 0);
        if ((res.data?.thread || []).length === 0) setShowCompose(true);
      })
      .catch(() => toast.error('Could not load messages'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchThread(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [thread]);

  const handleSend = async (e) => {
    e?.preventDefault?.();
    if (!bodyText.trim()) return;
    setSending(true);
    try {
      const res = await investorService.storeMessage({ subject: subject || null, body_html: body, department });
      const newMsg = res.data?.data;
      if (newMsg) setThread(prev => [...prev, newMsg]);
      setBody(''); setBodyText(''); setSubject(''); setDepartment('admin'); setShowCompose(false);
      toast.success(res.data?.message || 'Message sent!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send');
    } finally { setSending(false); }
  };

  return (
    <div className="inv-page">
      <div className="inv-page__header">
        <div><h1>Messages</h1><p>Private conversation with our support team</p></div>
        <button className="btn btn-gold" onClick={() => setShowCompose(v => !v)}>
          <FiPlus size={15} /> New Message
        </button>
      </div>

      <div className="inv-msg-wrap">
        {/* THREAD WINDOW */}
        <div className="inv-msg-thread-box">
          <div className="inv-msg-thread-header">
            <div className="inv-msg-thread-header__icon"><FiMessageSquare size={18} /></div>
            <div>
              <div className="inv-msg-thread-header__title">Correspondence</div>
              <div className="inv-msg-thread-header__sub">Support &amp; Financial Team • Private</div>
            </div>
            {unread > 0 && <span className="inv-msg-unread-pill">{unread} new</span>}
          </div>

          <div className="inv-msg-thread-body">
            {loading ? (
              <div className="inv-msg-loading">
                <div className="inv-msg-loading__dot"/><div className="inv-msg-loading__dot"/><div className="inv-msg-loading__dot"/>
              </div>
            ) : thread.length === 0 ? (
              <div className="inv-msg-empty">
                <FiMessageSquare size={40}/>
                <p>No messages yet. Send a message to get started.</p>
              </div>
            ) : (
              thread.map((msg, i) => {
                const isFinancial = msg.department === 'financial';
                const icon = msg.from === 'investor' ? '' : (isFinancial ? '💼 ' : '🛡️ ');
                return (
                  <div key={msg.id ?? i} className={`inv-msg-bubble ${msg.from === 'investor' ? 'bubble-me' : 'bubble-admin'} ${msg.kind === 'notice' ? 'bubble-notice' : ''}`}>
                    <div className="inv-msg-bubble__name">
                      {msg.from === 'investor' ? 'You' : `${icon}${msg.sender_label || 'Support Team'}`}
                      {msg.kind === 'notice' && <span className="inv-notice-tag">Official Notice</span>}
                    </div>
                    {msg.subject && <div className="inv-msg-bubble__subject">{msg.subject}</div>}
                    <RichText className="inv-msg-bubble__text" html={msg.body_html} text={msg.body} />
                    <div className="inv-msg-bubble__time">
                      {msg.time_ago || msg.created_at}
                      {msg.from !== 'investor' && msg.status === 'read' && ' · Read'}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick reply bar (hidden while the full compose panel is open: both write to the same draft) */}
          {!showCompose && (
            <div className="inv-msg-quick-reply inv-msg-quick-reply--rich">
              <RichComposer
                value={body}
                onChange={(html, text) => { setBody(html); setBodyText(text); }}
                onSend={handleSend}
                sending={sending}
                placeholder="Type a message…"
                sendLabel="Send"
              />
            </div>
          )}
        </div>

        {/* COMPOSE PANEL */}
        {showCompose && (
          <div className="inv-msg-compose">
            <div className="inv-msg-compose__header">
              <h3>New Message to Support</h3>
              <button className="inv-msg-compose__close" onClick={() => setShowCompose(false)}>✕</button>
            </div>
            <form onSubmit={handleSend}>
              <div className="form-group">
                <label className="form-label">Send to</label>
                <select className="form-control" value={department} onChange={e => setDepartment(e.target.value)}>
                  <option value="admin">Support Team</option>
                  <option value="financial">Financial Team</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Subject <span style={{ color:'var(--gray-400)', fontWeight:400 }}>(optional)</span></label>
                <input className="form-control" placeholder="e.g. Question about my deposit" value={subject} onChange={e => setSubject(e.target.value)}/>
              </div>
              <div className="form-group">
                <label className="form-label">Message</label>
                <RichComposer value={body} onChange={(html, text) => { setBody(html); setBodyText(text); }} onSend={handleSend} sending={sending} hideSend placeholder="Describe your issue or question…" />
              </div>
              <div style={{ display:'flex', gap:'0.75rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowCompose(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={sending || !bodyText.trim()}>
                  {sending ? <span className="spinner"/> : <><FiSend size={14}/> Send Message</>}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
