// LOCATION: src/pages/investor/InvestorEmails.jsx
import { useState, useEffect } from 'react';
import { FiMail, FiPaperclip, FiX } from 'react-icons/fi';
import { investorService } from '../../services/api';
import toast from 'react-hot-toast';
import RichText from '../../components/RichText';
import './InvestorPages.css';

export default function InvestorEmails() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);
  const [selected, setSelected] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchEmails = () => {
    investorService.getEmails()
      .then(res => {
        setEmails(res.data?.emails || []);
        setUnread(res.data?.unread_count || 0);
      })
      .catch(() => toast.error('Failed to load emails'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchEmails(); }, []);

  const openEmail = async (id) => {
    setLoadingDetail(true);
    try {
      const res = await investorService.showEmail(id);
      setSelected(res.data?.email);
      setEmails(list => list.map(e => e.id === id ? { ...e, is_read: true } : e));
      setUnread(u => Math.max(0, u - (emails.find(e => e.id === id)?.is_read ? 0 : 1)));
    } catch {
      toast.error('Failed to load email');
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="inv-page">
      <div className="inv-page__header">
        <div>
          <h1>Email History</h1>
          <p>Emails sent to you by Smart System Investment {unread > 0 && `· ${unread} unread`}</p>
        </div>
      </div>

      <div className="inv-card">
        {loading ? (
          <div className="inv-loading">Loading…</div>
        ) : emails.length === 0 ? (
          <div className="inv-empty-state"><FiMail size={40} /><p>No emails yet</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Subject</th><th>Sender</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>
                {emails.map(e => (
                  <tr key={e.id} onClick={() => openEmail(e.id)} style={{ cursor: 'pointer', fontWeight: e.is_read ? 400 : 700 }}>
                    <td>
                      {!e.is_read && <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--royal)', marginRight: '0.5rem' }} />}
                      {e.subject}
                      {e.has_attachment && <FiPaperclip size={12} style={{ marginLeft: '0.4rem', color: 'var(--gray-400)' }} />}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>{e.sender}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--gray-400)' }}>{e.time_ago || '—'}</td>
                    <td><span className={`badge badge-${e.is_read ? 'info' : 'success'}`}>{e.is_read ? 'Read' : 'New'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className="adm-modal-overlay" onClick={() => setSelected(null)}>
          <div className="adm-modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
            <h3>{selected.subject}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginBottom: '1rem' }}>
              From {selected.sender} · {selected.sent_at ? new Date(selected.sent_at).toLocaleString() : '—'}
            </p>
            {/* the server sanitises this HTML on write and again on read (InvestorEmailController::show) */}
            <div style={{ border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', padding: '1.25rem', fontSize: '0.88rem', lineHeight: 1.7 }}>
              <RichText html={selected.body_html} text="" />
            </div>
            <div className="adm-modal-footer">
              <button className="btn btn-ghost" onClick={() => setSelected(null)}><FiX size={14} /> Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}