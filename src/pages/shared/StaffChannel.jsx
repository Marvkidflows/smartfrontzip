// LOCATION: src/pages/shared/StaffChannel.jsx
//
// One shared conversation between Admin and Financial — everyone on
// both sides posts to and reads the SAME thread (not a per-user inbox,
// unlike src/pages/shared/DevRequests.jsx). Mounted at both
// /admin/staff-messages and /financial/staff-messages; staffMessageService
// picks the right API prefix automatically based on the current path.
// Reuses the same bubble styling as InvestorMessages.jsx / MarvFlow's
// request threads, just with sender NAME + ROLE shown (since multiple
// people on each side can post here, "You" alone wouldn't distinguish
// which admin or which financial team member said what).
import { useState, useEffect, useRef } from 'react';
import { FiMessageCircle, FiSend } from 'react-icons/fi';
import { staffMessageService } from '../../services/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import RichComposer from '../../components/RichComposer';
import RichText from '../../components/RichText';
import '../admin/AdminPages.css';
import '../investor/InvestorMessages.css';

export default function StaffChannel({ embedded = false }) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');     // optional, up to 150 characters
  const [body, setBody] = useState('');           // formatted message (HTML)
  const [bodyText, setBodyText] = useState('');   // plain-text form (empty check)
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const fetchMessages = () => {
    staffMessageService.getMessages()
      .then(res => setMessages(res.data?.messages || []))
      .catch(() => toast.error('Failed to load messages'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMessages(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const handleSend = async (e) => {
    e?.preventDefault?.();
    if (!bodyText.trim()) return;
    if (subject.trim().length > 150) { toast.error('The subject can be at most 150 characters.'); return; }   // the server enforces the same limit
    setSending(true);
    try {
      const res = await staffMessageService.sendMessage({ subject: subject.trim() || undefined, body_html: body });
      setMessages(prev => [...prev, res.data?.staff_message]);
      setBody(''); setBodyText(''); setSubject('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={embedded ? '' : 'adm-page'}>
      {!embedded && (
        <div className="adm-page-header">
          <div><h1>Admin ↔ Financial Channel</h1><p>A shared space for the Admin and Financial teams to coordinate</p></div>
        </div>
      )}

      <div className="adm-card" style={{ display: 'flex', flexDirection: 'column', minHeight: '65vh' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>Loading…</div>
        ) : (
          <div style={{ flex: 1, minHeight: 200, maxHeight: '45vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.5rem' }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.85rem', margin: 'auto' }}>
                <FiMessageCircle size={28} style={{ marginBottom: '0.5rem' }} />
                <div>No messages yet. Start the conversation.</div>
              </div>
            ) : messages.map(m => (
              <div key={m.id} className={`inv-msg-bubble ${m.sender_id === user?.id ? 'bubble-me' : 'bubble-admin'}`}>
                <div className="inv-msg-bubble__name">
                  {m.sender_id === user?.id ? 'You' : m.sender_name} — <span style={{ textTransform: 'capitalize' }}>{m.sender_role}</span>
                </div>
                {m.subject && <div className="inv-msg-bubble__subject" style={{ fontWeight: 600, marginBottom: 2 }}>{m.subject}</div>}
                <RichText className="inv-msg-bubble__text" html={m.body_html} text={m.body} />
                <div className="inv-msg-bubble__time">{new Date(m.created_at).toLocaleString()}</div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}

        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--gray-200)' }}>
          <input
            className="form-control" placeholder="Subject (optional)" maxLength={150}
            value={subject} onChange={e => setSubject(e.target.value)} aria-describedby="staff-subject-count"
          />
          {subject.length > 100 && <small id="staff-subject-count" style={{ alignSelf: 'flex-end', color: subject.length >= 150 ? '#dc2626' : 'var(--gray-500)' }}>{subject.length}/150</small>}
          <RichComposer
            value={body}
            onChange={(html, text) => { setBody(html); setBodyText(text); }}
            onSend={handleSend}
            sending={sending}
            placeholder="Type a message…"
          />
        </form>
      </div>
    </div>
  );
}
