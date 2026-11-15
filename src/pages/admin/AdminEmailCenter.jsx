// LOCATION: src/pages/admin/AdminEmailCenter.jsx
import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import RichComposer from '../../components/RichComposer';
import RichText from '../../components/RichText';
import EmailPreviewFrame from '../../components/EmailPreviewFrame';
import { safeEmailHtml } from '../../utils/safeHtml';
import {
  FiMail, FiSend, FiPaperclip, FiSearch, FiX, FiCheck, FiUsers,
  FiCheckCircle, FiXCircle, FiFileText, FiPlus, FiEdit2, FiTrash2, FiEye,
} from 'react-icons/fi';
import { adminService } from '../../services/api';
import toast from 'react-hot-toast';
import { NameWithRank } from '../../components/RankBadge';
import './AdminPages.css';
import './AdminEmailCenter.css';

// The Email Center UI is shared: admins use it as-is, and the Financial Team
// dashboard mounts the same component with `service={financialService}` so it
// talks to the Financial-scoped endpoints instead. Every tab reads the active
// service from this context (defaults to adminService = unchanged behaviour).
const EmailServiceContext = createContext(adminService);
const useEmailService = () => useContext(EmailServiceContext);

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'compose',   label: 'Compose Email' },
  { key: 'bulk',      label: 'Bulk Email' },
  { key: 'templates', label: 'Email Templates' },
  { key: 'logs',      label: 'Sent Emails / Logs' },
];

// The editor toolbar now comes from RichComposer (variant="email"): font, size, colour, alignment, spacing, lists, links, headings, images, undo/redo.
// =============================================================================
// DASHBOARD TAB
// =============================================================================
function DashboardTab() {
  const svc = useEmailService();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    svc.getEmailDashboard()
      .then(res => setData(res.data))
      .catch(() => toast.error('Failed to load email dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>Loading…</div>;

  const stats = data?.stats || {};
  const recent = data?.recent || [];

  const CARDS = [
    { label: 'Total Sent',   value: stats.total_sent ?? 0,   icon: FiCheckCircle, grad: 'linear-gradient(135deg,#10B981,#059669)' },
    { label: 'Sent Today',   value: stats.sent_today ?? 0,   icon: FiMail,        grad: 'linear-gradient(135deg,var(--royal),var(--royal-light))' },
    { label: 'Failed',       value: stats.total_failed ?? 0, icon: FiXCircle,     grad: 'linear-gradient(135deg,#EF4444,#DC2626)' },
    { label: 'Templates',    value: stats.templates ?? 0,    icon: FiFileText,    grad: 'linear-gradient(135deg,var(--gold),var(--gold-light))' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="adm-stats-grid">
        {CARDS.map(c => (
          <div key={c.label} className="adm-stat-card" style={{ background: c.grad }}>
            <div className="adm-stat-card__icon"><c.icon size={20} /></div>
            <div className="adm-stat-card__body">
              <div className="adm-stat-card__label">{c.label}</div>
              <div className="adm-stat-card__value">{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="adm-card">
        <h3 className="adm-card__title">Recent Emails</h3>
        {recent.length === 0 ? (
          <div className="adm-empty"><FiMail size={32} /><p>No emails sent yet</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Recipient</th><th>Subject</th><th>Status</th><th>Sent</th></tr></thead>
              <tbody>
                {recent.map(e => (
                  <tr key={e.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{e.recipient_name || '—'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{e.recipient_email}</div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{e.subject}</td>
                    <td><span className={`badge badge-${e.status === 'sent' ? 'success' : e.status === 'failed' ? 'danger' : 'warning'}`}>{e.status}</span></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>{e.sent_at || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// COMPOSE TAB
// =============================================================================
function ComposeTab({ prefill, onConsumePrefill }) {
  const svc = useEmailService();
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [subject, setSubject]   = useState('');
  const [body, setBody]         = useState('');
  const [attachment, setAttachment] = useState(null);
  const [sending, setSending]   = useState(false);
  const [testing, setTesting]   = useState(false);
  const searchTimer = useRef(null);
  const fileInputRef = useRef(null);

  // Allow other tabs (Templates "Use", investor profile "Send Email") to prefill this tab
  useEffect(() => {
    if (prefill) {
      if (prefill.investor) {
        setSelected(prefill.investor);
        setQuery(`${prefill.investor.name} <${prefill.investor.email}>`);
      }
      if (prefill.subject) setSubject(prefill.subject);
      if (prefill.body_html) setBody(safeEmailHtml(prefill.body_html));     // client guard before it reaches the editor
      onConsumePrefill?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  const handleSearchChange = (val) => {
    setQuery(val);
    setSelected(null);
    clearTimeout(searchTimer.current);

    if (!val.trim()) { setResults([]); return; }

    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await svc.searchEmailInvestors(val.trim());
        setResults(res.data?.investors || []);
      } catch {
        toast.error('Failed to search investors');
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const pickInvestor = (investor) => {
    setSelected(investor);
    setQuery(`${investor.name} <${investor.email}>`);
    setResults([]);
  };

  const resetForm = () => {
    setSelected(null); setQuery(''); setSubject(''); setBody(''); setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append('investor_id', selected.id);
    fd.append('subject', subject);
    fd.append('body_html', body);
    if (attachment) fd.append('attachment', attachment);
    return fd;
  };

  const handleSend = async () => {
    if (!selected) return toast.error('Please select a recipient.');
    if (!subject.trim()) return toast.error('Subject is required.');
    if (!body.trim() || body === '<p><br></p>') return toast.error('Message body is required.');

    setSending(true);
    try {
      const res = await svc.sendEmail(buildFormData());
      if (res.data?.success) {
        toast.success(res.data?.message || 'Email sent successfully!');
        resetForm();
      } else {
        toast.error(res.data?.message || 'Failed to send email.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send email.');
    } finally {
      setSending(false);
    }
  };

  const handleSendTest = async () => {
    if (!subject.trim() || !body.trim()) return toast.error('Fill in subject and message first.');
    setTesting(true);
    try {
      const res = await svc.sendTestEmail({ subject, body_html: body });
      toast.success(res.data?.message || 'Test email sent to your address.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send test email.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="ec-compose-grid">
      <div className="adm-card">
        <h3 className="adm-card__title">Compose Email</h3>

        <div className="form-group" style={{ position: 'relative' }}>
          <label className="form-label">Recipient</label>
          <div className="auth-input-wrap" style={{ position: 'relative' }}>
            <FiSearch className="auth-input-icon" size={15} />
            <input
              className="form-control auth-input"
              placeholder="Search investor by name or email…"
              value={query}
              onChange={e => handleSearchChange(e.target.value)}
            />
            {selected && (
              <button type="button" onClick={resetForm} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--gray-400)' }}>
                <FiX size={16} />
              </button>
            )}
          </div>
          {results.length > 0 && (
            <div className="ec-search-dropdown">
              {results.map(inv => (
                <div key={inv.id} className="ec-search-item" onClick={() => pickInvestor(inv)}>
                  <div className="ec-search-item__avatar">{(inv.name || '?').charAt(0).toUpperCase()}</div>
                  <div>
                    <div className="ec-search-item__name"><NameWithRank name={inv.name || '—'} rank={inv.rank} /></div>
                    <div className="ec-search-item__email">{inv.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {searching && <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginTop: '0.4rem' }}>Searching…</div>}
        </div>

        {selected && (
          <div className="ec-selected-recipient">
            <FiCheck size={14} /> Sending to <strong><NameWithRank name={selected.name} rank={selected.rank} /></strong> ({selected.email})
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Subject</label>
          <input className="form-control" placeholder="Email subject…" value={subject} onChange={e => setSubject(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Message</label>
          <div className="ec-quill-wrap">
            <RichComposer variant="email" value={body} onChange={(html) => setBody(html)} onSend={handleSend} hideSend placeholder="Write your email…" />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Attachment (optional)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileInputRef.current?.click()}>
              <FiPaperclip size={14} /> {attachment ? attachment.name : 'Choose file'}
            </button>
            {attachment && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                <FiX size={13} />
              </button>
            )}
            <input ref={fileInputRef} type="file" hidden onChange={e => setAttachment(e.target.files?.[0] || null)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button className="btn btn-ghost" onClick={handleSendTest} disabled={testing || sending}>
            {testing ? <span className="spinner" /> : 'Send Test Email'}
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSend} disabled={sending || testing}>
            {sending ? <span className="spinner" /> : <><FiSend size={14} /> Send Email</>}
          </button>
        </div>
      </div>

      <div className="adm-card">
        <h3 className="adm-card__title">Preview</h3>
        <div className="ec-preview-frame">
          <div className="ec-preview-header">
            <FiMail size={14} /> {subject || <span style={{ color: 'var(--gray-300)' }}>Subject will appear here</span>}
          </div>
          <EmailPreviewFrame html={body} />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// BULK EMAIL TAB
// =============================================================================
const BULK_FILTERS = [
  { value: 'all',          label: 'All Investors' },
  { value: 'active',       label: 'Active Investors' },
  { value: 'suspended',    label: 'Suspended Investors' },
  { value: 'frozen',       label: 'Frozen Investors' },
  { value: 'pending_kyc',  label: 'Pending KYC' },
  { value: 'verified',     label: 'Verified Investors' },
];

function BulkTab() {
  const svc = useEmailService();
  const [filter, setFilter]     = useState('all');
  const [country, setCountry]   = useState('');
  const [planId, setPlanId]     = useState('');
  const [countries, setCountries] = useState([]);
  const [plans, setPlans]       = useState([]);
  const [subject, setSubject]   = useState('');
  const [body, setBody]         = useState('');
  const [count, setCount]       = useState(null);
  const [counting, setCounting] = useState(false);
  const [sending, setSending]   = useState(false);
  const [result, setResult]     = useState(null);

  // Load countries + plans once, for the two conditional dropdowns
  useEffect(() => {
    svc.getEmailCountries()
      .then(res => setCountries(res.data?.countries || []))
      .catch(() => {});
    svc.getInvestmentPlans()
      .then(res => setPlans(res.data?.plans || res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Country/plan filters need their sub-value chosen before counting meaningfully
    if (filter === 'country' && !country) { setCount(0); return; }
    if (filter === 'plan' && !planId) { setCount(0); return; }

    setCounting(true);
    setResult(null);
    svc.getBulkCount({ filter, country, plan_id: planId })
      .then(res => setCount(res.data?.count ?? 0))
      .catch(() => setCount(null))
      .finally(() => setCounting(false));
  }, [filter, country, planId]);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim() || body === '<p><br></p>') {
      return toast.error('Subject and message are required.');
    }
    if (filter === 'country' && !country) return toast.error('Please select a country.');
    if (filter === 'plan' && !planId) return toast.error('Please select an investment plan.');
    if (!count) return toast.error('No investors match this filter.');

    if (!window.confirm(`Send this email to ${count} investor(s)? This cannot be undone.`)) return;

    setSending(true);
    setResult(null);
    try {
      const res = await svc.bulkSendEmail({ filter, country, plan_id: planId, subject, body_html: body });
      setResult(res.data);
      toast.success(res.data?.message || 'Bulk email queued.');
      setSubject(''); setBody('');
    } catch (err) {
      const msg = err.response?.data?.message || 'Bulk send failed.';
      toast.error(msg);
      setResult({ success: false, message: msg });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="ec-compose-grid">
      <div className="adm-card">
        <h3 className="adm-card__title">Bulk Email</h3>

        <div className="form-group">
          <label className="form-label">Recipient Filter</label>
          <select className="form-control" value={filter} onChange={e => { setFilter(e.target.value); setCountry(''); setPlanId(''); }}>
            {BULK_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            <option value="country">Investors by Country</option>
            <option value="plan">Investors by Investment Plan</option>
          </select>
        </div>

        {filter === 'country' && (
          <div className="form-group">
            <label className="form-label">Country</label>
            <select className="form-control" value={country} onChange={e => setCountry(e.target.value)}>
              <option value="">Select a country…</option>
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        {filter === 'plan' && (
          <div className="form-group">
            <label className="form-label">Investment Plan</label>
            <select className="form-control" value={planId} onChange={e => setPlanId(e.target.value)}>
              <option value="">Select a plan…</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        <div className="ec-recipient-count">
          <FiUsers size={16} />
          {counting ? 'Counting…' : (
            <span><strong>{count ?? 0}</strong> investor{count === 1 ? '' : 's'} will receive this email</span>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Subject</label>
          <input className="form-control" placeholder="Email subject…" value={subject} onChange={e => setSubject(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Message</label>
          <div className="ec-quill-wrap">
            <RichComposer variant="email" value={body} onChange={(html) => setBody(html)} onSend={handleSend} hideSend placeholder="Write your email…" />
          </div>
        </div>

        <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={handleSend} disabled={sending}>
          {sending ? <span className="spinner" /> : <><FiSend size={14} /> Send to {count ?? 0} Investors</>}
        </button>

        {result && (
          <div style={{ marginTop: '1rem', fontSize: '0.85rem', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', background: result.success ? 'var(--success-bg)' : 'var(--danger-bg)', color: result.success ? 'var(--success)' : 'var(--danger)' }}>
            {result.message}
          </div>
        )}
      </div>

      <div className="adm-card">
        <h3 className="adm-card__title">Preview</h3>
        <div className="ec-preview-frame">
          <div className="ec-preview-header">
            <FiMail size={14} /> {subject || <span style={{ color: 'var(--gray-300)' }}>Subject will appear here</span>}
          </div>
          <EmailPreviewFrame html={body} />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// TEMPLATES TAB
// =============================================================================
function TemplateEditorModal({ template, onClose, onSaved }) {
  const svc = useEmailService();
  const [name, setName] = useState(template?.name || '');
  const [category, setCategory] = useState(template?.category || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [body, setBody] = useState(safeEmailHtml(template?.body_html || ''));   // client guard before it reaches the editor
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !subject.trim() || !body.trim()) return toast.error('Name, subject, and body are required.');
    setSaving(true);
    try {
      const payload = { name, category, subject, body_html: body };
      if (template) {
        await svc.updateEmailTemplate(template.id, payload);
        toast.success('Template updated.');
      } else {
        await svc.createEmailTemplate(payload);
        toast.success('Template created.');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save template.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <h3>{template ? 'Edit Template' : 'New Template'}</h3>
        <div className="form-group">
          <label className="form-label">Template Name</label>
          <input className="form-control" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Welcome Email" />
        </div>
        <div className="form-group">
          <label className="form-label">Category (optional)</label>
          <input className="form-control" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. account, deposit, kyc" />
        </div>
        <div className="form-group">
          <label className="form-label">Subject</label>
          <input className="form-control" value={subject} onChange={e => setSubject(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Body</label>
          <div className="ec-quill-wrap">
            <RichComposer variant="email" value={body} onChange={(html) => setBody(html)} hideSend placeholder="Write the template…" />
          </div>
        </div>
        <div className="adm-modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner" /> : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TemplatesTab({ onUseTemplate }) {
  const svc = useEmailService();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null=closed, {}=new, template=edit
  const [showEditor, setShowEditor] = useState(false);

  const fetchTemplates = () => {
    setLoading(true);
    svc.getEmailTemplates()
      .then(res => setTemplates(res.data?.templates || []))
      .catch(() => toast.error('Failed to load templates'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await svc.deleteEmailTemplate(id);
      toast.success('Template deleted.');
      fetchTemplates();
    } catch {
      toast.error('Failed to delete template.');
    }
  };

  return (
    <div className="adm-card">
      <div className="adm-card__header">
        <h3 className="adm-card__title" style={{ marginBottom: 0 }}>Email Templates</h3>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setShowEditor(true); }}>
          <FiPlus size={14} /> New Template
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>Loading…</div>
      ) : templates.length === 0 ? (
        <div className="adm-empty"><FiFileText size={32} /><p>No templates yet. Create your first one.</p></div>
      ) : (
        <div className="ec-template-grid">
          {templates.map(t => (
            <div key={t.id} className="ec-template-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy)' }}>{t.name}</div>
                  {t.category && <span className="badge badge-navy" style={{ marginTop: '0.3rem' }}>{t.category}</span>}
                  {t.shared && <span className="badge badge-info" style={{ marginTop: '0.3rem', marginLeft: t.category ? '0.3rem' : 0 }}>Shared</span>}
                </div>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)', margin: '0.6rem 0' }}>{t.subject}</div>
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem' }}>
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => onUseTemplate(t)}>Use</button>
                {t.editable !== false && (
                  <>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(t); setShowEditor(true); }}><FiEdit2 size={13} /></button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}><FiTrash2 size={13} /></button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showEditor && (
        <TemplateEditorModal
          template={editing}
          onClose={() => setShowEditor(false)}
          onSaved={() => { setShowEditor(false); fetchTemplates(); }}
        />
      )}
    </div>
  );
}

// =============================================================================
// LOGS TAB
// =============================================================================
function LogsTab() {
  const svc = useEmailService();
  const [logs, setLogs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);

  const fetchLogs = () => {
    setLoading(true);
    svc.getEmailLogs({ search, status, page })
      .then(res => setLogs(res.data))
      .catch(() => toast.error('Failed to load logs'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(); }, [page]);
  useEffect(() => { const t = setTimeout(() => { setPage(1); fetchLogs(); }, 400); return () => clearTimeout(t); }, [search, status]);

  const openDetail = async (id) => {
    try {
      const res = await svc.getEmailLogDetail(id);
      setDetail(res.data?.email);
    } catch {
      toast.error('Failed to load email detail');
    }
  };

  const rows = logs?.data || [];

  return (
    <div className="adm-card">
      <div className="adm-card__header">
        <h3 className="adm-card__title" style={{ marginBottom: 0 }}>Sent Emails / Logs</h3>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div className="adm-search" style={{ maxWidth: 260 }}>
            <FiSearch size={14} />
            <input placeholder="Search recipient or subject…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-control" style={{ width: 150 }} value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="queued">Queued</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div className="adm-empty"><FiMail size={32} /><p>No emails found</p></div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Recipient</th><th>Subject</th><th>Sent By</th><th>Status</th><th>Date</th><th></th></tr></thead>
              <tbody>
                {rows.map(e => (
                  <tr key={e.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{e.recipient_name || e.investor?.name || '—'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{e.recipient_email}</div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{e.subject}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>{e.admin?.name || '—'}</td>
                    <td><span className={`badge badge-${e.status === 'sent' ? 'success' : e.status === 'failed' ? 'danger' : 'warning'}`}>{e.status}</span></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>{e.sent_at ? new Date(e.sent_at).toLocaleString() : '—'}</td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => openDetail(e.id)}><FiEye size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {logs?.last_page > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <span style={{ fontSize: '0.82rem', color: 'var(--gray-500)', alignSelf: 'center' }}>Page {logs.current_page} of {logs.last_page}</span>
              <button className="btn btn-ghost btn-sm" disabled={page >= logs.last_page} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </>
      )}

      {detail && (
        <div className="adm-modal-overlay" onClick={() => setDetail(null)}>
          <div className="adm-modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <h3>{detail.subject}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginBottom: '1rem' }}>
              To: {detail.recipient_name} ({detail.recipient_email}) · {detail.sent_at ? new Date(detail.sent_at).toLocaleString() : '—'}
            </p>
            {detail.status === 'failed' && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.82rem', marginBottom: '1rem' }}>
                <strong>Delivery failed.</strong> {detail.error_message || 'No error detail was recorded.'}
              </div>
            )}
            {detail.status === 'queued' && (
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E', borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.82rem', marginBottom: '1rem' }}>
                <strong>Still queued.</strong> This email has not been sent yet. Bulk emails are only delivered while the queue worker (<code>php artisan queue:work</code>) is running.
              </div>
            )}
            <div className="ec-preview-frame">
              <RichText className="ec-preview-body" html={detail.body_html} text="" />
            </div>
            <div className="adm-modal-footer">
              <button className="btn btn-ghost" onClick={() => setDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================
export default function AdminEmailCenter({ service = adminService, embedded = false }) {
  const location = useLocation();
  const [tab, setTab] = useState('compose');
  const [composePrefill, setComposePrefill] = useState(
    location.state?.prefillInvestor ? { investor: location.state.prefillInvestor } : null
  );

  useEffect(() => {
    if (location.state?.prefillInvestor) {
      setComposePrefill({ investor: location.state.prefillInvestor });
      setTab('compose');
      // Clear the navigation state so refreshing the page doesn't re-trigger it
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useTemplate = (template) => {
    setComposePrefill({ subject: template.subject, body_html: template.body_html });
    setTab('compose');
  };

  return (
    <EmailServiceContext.Provider value={service}>
    <div className={embedded ? '' : 'adm-page'}>
      {!embedded && (
        <div className="adm-page-header">
          <div><h1>Email Center</h1><p>Send, template, and track investor communications</p></div>
        </div>
      )}

      <div className="ec-tabs">
        {TABS.map(t => (
          <button key={t.key} className={`ec-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'compose'   && <ComposeTab prefill={composePrefill} onConsumePrefill={() => setComposePrefill(null)} />}
      {tab === 'bulk'      && <BulkTab />}
      {tab === 'templates' && <TemplatesTab onUseTemplate={useTemplate} />}
      {tab === 'logs'      && <LogsTab />}
    </div>
    </EmailServiceContext.Provider>
  );
}