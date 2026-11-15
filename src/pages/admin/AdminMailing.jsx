// TASK 3 — Mailing administration (General Public Mailing / Investor Mailing).
// One component, mounted twice: <AdminMailing environment="public" /> and <AdminMailing environment="investor" />.
// All authorisation is enforced by the API; this UI only hides what the server would refuse.
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FiShield, FiGlobe } from 'react-icons/fi';
import { mailingService as svc } from '../../services/mailingApi';
import { safeEmailHtml } from '../../utils/safeHtml';
import './AdminPages.css';
import './AdminMailing.css';

const errMsg = (e, fallback = 'Something went wrong') => {
  const d = e?.response?.data;
  return (d?.errors && Object.values(d.errors).flat()[0]) || d?.message || fallback;
};
const fmt = (d) => (d ? new Date(d).toLocaleString() : '—');
const STATUS_BADGE = { sent: 'badge-success', delivered: 'badge-success', received: 'badge-info', queued: 'badge-warning', sending: 'badge-warning', scheduled: 'badge-info', draft: 'badge-navy', failed: 'badge-danger', bounced: 'badge-danger', skipped: 'badge-gold', cancelled: 'badge-navy', partial: 'badge-warning', granted: 'badge-success', pending: 'badge-warning', withdrawn: 'badge-danger' };
const Badge = ({ s }) => <span className={`badge ${STATUS_BADGE[s] || 'badge-navy'}`}>{s}</span>;

function Pager({ page, setPage, meta }) {
  if (!meta || meta.last_page <= 1) return null;
  return (
    <div className="ml-pager">
      <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
      <span className="ml-muted">Page {meta.current_page} of {meta.last_page}</span>
      <button className="btn btn-outline btn-sm" disabled={page >= meta.last_page} onClick={() => setPage(page + 1)}>Next</button>
    </div>
  );
}

// Loads a paginated list, re-fetching when filters/page change.
function useList(fetcher, filters) {
  const [rows, setRows] = useState([]); const [meta, setMeta] = useState(null); const [page, setPage] = useState(1); const [loading, setLoading] = useState(true);
  const key = JSON.stringify(filters);
  const load = useCallback(() => {
    setLoading(true);
    fetcher({ ...filters, page }).then(r => { setRows(r.data.data || []); setMeta(r.data); })
      .catch(e => toast.error(errMsg(e, 'Could not load data'))).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, page]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [key]);
  return { rows, meta, page, setPage, loading, reload: load };
}

// ── Overview ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
function Overview({ env }) {
  const [d, setD] = useState(null);
  useEffect(() => { svc.dashboard(env).then(r => setD(r.data)).catch(e => toast.error(errMsg(e, 'Could not load dashboard'))); }, [env]);
  if (!d) return <p className="ml-muted">Loading…</p>;
  const Stat = ({ v, l }) => <div className="ml-stat"><b>{v ?? 0}</b><span>{l}</span></div>;
  return (
    <>
      <div className="ml-grid">
        <Stat v={d.delivery.sent + d.delivery.delivered} l="Sent (30 days)" />
        <Stat v={d.delivery.queued} l="Queued" />
        <Stat v={d.delivery.failed + d.delivery.bounced} l="Failed / bounced" />
        <Stat v={d.delivery.skipped} l="Skipped (consent / eligibility)" />
        <Stat v={d.unsubscribes_30d} l="Unsubscribes (30 days)" />
        <Stat v={d.inbound_open} l="Unassigned inbound" />
        <Stat v={`${d.mailboxes.connected}/${d.mailboxes.total}`} l="Mailboxes connected" />
        {env === 'investor' && <Stat v={d.eligible_investors} l="Verified eligible investors" />}
      </div>
      <div className="adm-card"><div className="adm-card__header"><h3 className="adm-card__title">Consent</h3></div>
        <div className="ml-table-wrap"><table className="ml-table"><thead><tr><th>Purpose</th><th>Granted</th><th>Pending</th><th>Withdrawn</th></tr></thead>
          <tbody>{Object.entries(d.subscriptions).map(([p, v]) => <tr key={p}><td>{p.replace(/_/g, ' ')}</td><td>{v.granted}</td><td>{v.pending}</td><td>{v.withdrawn}</td></tr>)}</tbody></table></div>
      </div>
      <div className="adm-card" style={{ marginTop: '1rem' }}><div className="adm-card__header"><h3 className="adm-card__title">Recent failures</h3></div>
        {d.recent_failures.length === 0 ? <p className="ml-muted">No failed deliveries.</p> :
          <ul>{d.recent_failures.map(f => <li key={f.id}>{f.subject} — <Badge s={f.status} /> <span className="ml-muted">{f.error_code}</span></li>)}</ul>}
      </div>
    </>
  );
}

// ── Campaigns ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
const blank = { name: '', subject: '', body_html: '', kind: 'newsletter', audience_type: '', audience_filters: null, template_id: null };

function Campaigns({ env, canSend, canManage = true }) {
  const [status, setStatus] = useState(''); const [q, setQ] = useState('');
  const list = useList((p) => svc.campaigns(env, p), { status, q });
  const [edit, setEdit] = useState(null); const [aud, setAud] = useState({}); const [tags, setTags] = useState([]); const [templates, setTemplates] = useState([]);
  const [token] = useState(() => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())));
  const [when, setWhen] = useState('');

  useEffect(() => {
    svc.audiences(env).then(r => { setAud(r.data.audiences); setTags(r.data.merge_tags); }).catch(() => {});
    svc.templates(env).then(r => setTemplates(r.data.templates)).catch(() => {});
  }, [env]);

  const open = (c) => c ? svc.campaign(env, c.id).then(r => setEdit(r.data.campaign)) : setEdit({ ...blank, audience_type: Object.keys(aud)[0] || '' });
  const save = async () => {
    try {
      const body = { name: edit.name, subject: edit.subject, body_html: edit.body_html, kind: edit.kind, audience_type: edit.audience_type, audience_filters: edit.audience_filters, template_id: edit.template_id };
      if (edit.id) await svc.updateCampaign(env, edit.id, body); else await svc.createCampaign(env, { ...body, client_token: token });
      toast.success('Campaign saved'); setEdit(null); list.reload();
    } catch (e) { toast.error(errMsg(e)); }
  };
  const act = async (fn, ok) => { try { await fn(); toast.success(ok); list.reload(); } catch (e) { toast.error(errMsg(e)); } };
  const preview = async (c) => { try { const r = await svc.previewAudience(env, c.id); toast(`${r.data.recipient_count} eligible recipient(s) right now`); } catch (e) { toast.error(errMsg(e)); } };
  const send = (c) => { if (window.confirm(`Send "${c.name}" now? This cannot be undone.`)) act(() => svc.sendCampaign(env, c.id), 'Campaign queued'); };
  const schedule = (c) => { if (!when) return toast.error('Pick a date and time first'); act(() => svc.scheduleCampaign(env, c.id, new Date(when).toISOString()), 'Campaign scheduled'); };
  const applyTemplate = (id) => { const t = templates.find(x => String(x.id) === String(id)); if (t) setEdit(e => ({ ...e, template_id: t.id, subject: t.subject, body_html: t.body_html })); };

  return (
    <>
      <div className="ml-filters">
        <input className="form-control" placeholder="Search campaigns…" value={q} onChange={e => setQ(e.target.value)} />
        <select className="form-control" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All statuses</option>{['draft', 'scheduled', 'queued', 'sending', 'sent', 'partial', 'failed', 'cancelled'].map(s => <option key={s}>{s}</option>)}
        </select>
        {canManage && <button className="btn btn-primary btn-sm" onClick={() => open(null)}>New campaign</button>}
      </div>
      <div className="adm-card"><div className="ml-table-wrap"><table className="ml-table">
        <thead><tr><th>Name</th><th>Kind</th><th>Status</th><th>Scheduled</th><th>Sent / Failed / Skipped</th><th></th></tr></thead>
        <tbody>{list.rows.map(c => (
          <tr key={c.id}><td><b>{c.name}</b><div className="ml-muted">{c.subject}</div></td><td>{c.kind}</td><td><Badge s={c.status} /></td><td>{fmt(c.scheduled_at)}</td>
            <td>{c.sent_count} / {c.failed_count} / {c.skipped_count}</td>
            <td><div className="ml-actions">
              {canManage && ['draft', 'scheduled'].includes(c.status) && <button className="btn btn-outline btn-sm" onClick={() => open(c)}>Edit</button>}
              {['draft', 'scheduled'].includes(c.status) && <button className="btn btn-outline btn-sm" onClick={() => preview(c)}>Audience</button>}
              {canSend && ['draft', 'scheduled'].includes(c.status) && <button className="btn btn-primary btn-sm" onClick={() => send(c)}>Send now</button>}
              {canSend && ['draft', 'scheduled', 'queued', 'sending'].includes(c.status) && <button className="btn btn-danger btn-sm" onClick={() => act(() => svc.cancelCampaign(env, c.id), 'Cancelled')}>Cancel</button>}
              {canManage && c.status === 'draft' && <button className="btn btn-ghost btn-sm" onClick={() => window.confirm('Delete this draft?') && act(() => svc.deleteCampaign(env, c.id), 'Deleted')}>Delete</button>}
              {canSend && ['draft', 'scheduled'].includes(c.status) && (<><input type="datetime-local" className="form-control" style={{ width: 200 }} onChange={e => setWhen(e.target.value)} /><button className="btn btn-outline btn-sm" onClick={() => schedule(c)}>Schedule</button></>)}
            </div></td></tr>))}
          {!list.loading && list.rows.length === 0 && <tr><td colSpan={6} className="ml-muted">No campaigns yet.</td></tr>}
        </tbody></table></div><Pager {...list} /></div>

      {edit && (
        <div className="ml-modal" onClick={() => setEdit(null)}><div className="ml-modal__box" onClick={e => e.stopPropagation()}>
          <h3>{edit.id ? 'Edit campaign' : 'New campaign'}</h3>
          <div className="ml-form">
            <div className="form-group"><label className="form-label">Name</label><input className="form-control" value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} /></div>
            <div className="ml-row">
              <div className="form-group"><label className="form-label">Type</label>
                <select className="form-control" value={edit.kind} onChange={e => setEdit({ ...edit, kind: e.target.value })}>
                  <option value="newsletter">Newsletter (needs consent)</option><option value="announcement">Announcement (needs consent)</option>
                  {env === 'investor' && <option value="essential">Essential notice (no marketing consent; restricted)</option>}
                </select></div>
              <div className="form-group"><label className="form-label">Audience</label>
                <select className="form-control" value={edit.audience_type} onChange={e => setEdit({ ...edit, audience_type: e.target.value })}>
                  {Object.entries(aud).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            </div>
            {edit.audience_type === 'verified_investors_by_rank' && (
              <div className="form-group"><label className="form-label">Rank IDs (comma separated)</label>
                <input className="form-control" value={(edit.audience_filters?.rank_ids || []).join(',')} onChange={e => setEdit({ ...edit, audience_filters: { rank_ids: e.target.value.split(',').map(x => parseInt(x, 10)).filter(Boolean) } })} /></div>)}
            {templates.length > 0 && <div className="form-group"><label className="form-label">Start from template</label>
              <select className="form-control" value={edit.template_id || ''} onChange={e => applyTemplate(e.target.value)}><option value="">—</option>{templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>}
            <div className="form-group"><label className="form-label">Subject</label><input className="form-control" value={edit.subject} onChange={e => setEdit({ ...edit, subject: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Message (HTML)</label>
              <textarea className="form-control" rows={9} value={edit.body_html} onChange={e => setEdit({ ...edit, body_html: e.target.value })} />
              <div className="ml-muted">Allowed merge tags: {tags.map(t => `{{${t}}}`).join(', ')}. Scripts and unsafe markup are removed on save.</div></div>
            <div className="ml-body" dangerouslySetInnerHTML={{ __html: safeEmailHtml(edit.body_html || '') }} />
            <div className="ml-actions"><button className="btn btn-primary" onClick={save}>Save draft</button><button className="btn btn-outline" onClick={() => setEdit(null)}>Close</button></div>
          </div></div></div>)}
    </>
  );
}

// ── Templates ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
function Templates({ env, canManage }) {
  const [rows, setRows] = useState([]); const [edit, setEdit] = useState(null);
  const load = () => svc.templates(env).then(r => setRows(r.data.templates)).catch(e => toast.error(errMsg(e)));
  useEffect(() => { load(); }, [env]);
  const save = async () => {
    try { edit.id ? await svc.updateTemplate(env, edit.id, edit) : await svc.createTemplate(env, edit); toast.success('Template saved'); setEdit(null); load(); }
    catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <>
      {canManage && <div className="ml-filters"><button className="btn btn-primary btn-sm" onClick={() => setEdit({ name: '', subject: '', body_html: '' })}>New template</button></div>}
      <div className="adm-card"><div className="ml-table-wrap"><table className="ml-table"><thead><tr><th>Name</th><th>Subject</th><th>Updated</th><th></th></tr></thead>
        <tbody>{rows.map(t => <tr key={t.id}><td>{t.name}</td><td>{t.subject}</td><td>{fmt(t.updated_at)}</td>
          <td>{canManage && <div className="ml-actions"><button className="btn btn-outline btn-sm" onClick={() => setEdit(t)}>Edit</button>
            <button className="btn btn-ghost btn-sm" onClick={() => window.confirm('Delete template?') && svc.deleteTemplate(env, t.id).then(load)}>Delete</button></div>}</td></tr>)}
          {rows.length === 0 && <tr><td colSpan={4} className="ml-muted">No templates yet.</td></tr>}</tbody></table></div></div>
      {edit && <div className="ml-modal" onClick={() => setEdit(null)}><div className="ml-modal__box" onClick={e => e.stopPropagation()}><div className="ml-form">
        <h3>{edit.id ? 'Edit template' : 'New template'}</h3>
        <input className="form-control" placeholder="Name" value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} />
        <input className="form-control" placeholder="Subject" value={edit.subject} onChange={e => setEdit({ ...edit, subject: e.target.value })} />
        <textarea className="form-control" rows={9} placeholder="HTML body" value={edit.body_html} onChange={e => setEdit({ ...edit, body_html: e.target.value })} />
        <div className="ml-actions"><button className="btn btn-primary" onClick={save}>Save</button><button className="btn btn-outline" onClick={() => setEdit(null)}>Close</button></div>
      </div></div></div>}
    </>
  );
}

// ── Subscribers / Unsubscribes ───────────────────────────────────────────────────────────────────────────────────────────
function Subscribers({ env, canManage }) {
  const [q, setQ] = useState(''); const [status, setStatus] = useState(''); const [email, setEmail] = useState('');
  const list = useList((p) => svc.subscribers(env, p), { q, status });
  const unsub = (s) => window.confirm('Withdraw this consent?') && svc.unsubscribe(env, s.id).then(() => { toast.success('Unsubscribed'); list.reload(); }).catch(e => toast.error(errMsg(e)));
  const invite = () => svc.inviteSubscriber({ email, purposes: ['public_newsletter'] }).then(r => { toast.success(r.data.message); setEmail(''); list.reload(); }).catch(e => toast.error(errMsg(e)));
  if (!canManage) return <p className="ml-muted">Subscriber lists are restricted to staff with the manage permission.</p>;
  return (
    <>
      <div className="ml-filters">
        <input className="form-control" placeholder="Search email…" value={q} onChange={e => setQ(e.target.value)} />
        <select className="form-control" value={status} onChange={e => setStatus(e.target.value)}><option value="">All</option><option>granted</option><option>pending</option><option>withdrawn</option></select>
        {env === 'public' && <><input className="form-control" placeholder="Invite by email (double opt-in)" value={email} onChange={e => setEmail(e.target.value)} /><button className="btn btn-primary btn-sm" onClick={invite}>Send invitation</button></>}
      </div>
      <div className="adm-card"><div className="ml-table-wrap"><table className="ml-table"><thead><tr><th>Email</th><th>Purpose</th><th>Status</th><th>Changed</th><th></th></tr></thead>
        <tbody>{list.rows.map(s => <tr key={s.id}><td>{s.email}<div className="ml-muted">{s.name}</div></td><td>{s.purpose.replace(/_/g, ' ')}</td><td><Badge s={s.status} /></td><td>{fmt(s.changed_at)}</td>
          <td>{s.status !== 'withdrawn' && <button className="btn btn-outline btn-sm" onClick={() => unsub(s)}>Unsubscribe</button>}</td></tr>)}
          {!list.loading && list.rows.length === 0 && <tr><td colSpan={5} className="ml-muted">No subscribers.</td></tr>}</tbody></table></div><Pager {...list} /></div>
    </>
  );
}

function Unsubscribes({ env, canManage }) {
  const list = useList((p) => svc.unsubscribes(env, p), {});
  if (!canManage) return <p className="ml-muted">Restricted to staff with the manage permission.</p>;
  return <div className="adm-card"><div className="ml-table-wrap"><table className="ml-table"><thead><tr><th>Email</th><th>Purpose</th><th>Source</th><th>When</th></tr></thead>
    <tbody>{list.rows.map(c => <tr key={c.id}><td>{c.email}</td><td>{c.purpose.replace(/_/g, ' ')}</td><td>{c.source.replace(/_/g, ' ')}</td><td>{fmt(c.created_at)}</td></tr>)}
      {!list.loading && list.rows.length === 0 && <tr><td colSpan={4} className="ml-muted">No unsubscribes recorded.</td></tr>}</tbody></table></div><Pager {...list} /></div>;
}

// ── Delivery history / failures ────────────────────────────────────────────────────────────────────────────────────────────
function Messages({ env, failuresOnly, canSend }) {
  const [q, setQ] = useState(''); const [status, setStatus] = useState(''); const [direction, setDirection] = useState(''); const [open, setOpen] = useState(null);
  const filters = failuresOnly ? { q } : { q, status, direction };
  const list = useList((p) => (failuresOnly ? svc.failures(env, p) : svc.messages(env, p)), filters);
  const view = (m) => svc.message(m.id).then(r => setOpen(r.data.message)).catch(e => toast.error(errMsg(e)));
  const retry = (m) => svc.retry(env, m.id).then(() => { toast.success('Retry queued'); list.reload(); }).catch(e => toast.error(errMsg(e)));
  return (
    <>
      <div className="ml-filters">
        <input className="form-control" placeholder="Search subject or address…" value={q} onChange={e => setQ(e.target.value)} />
        {!failuresOnly && <><select className="form-control" value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{['queued', 'sent', 'delivered', 'failed', 'bounced', 'skipped', 'received'].map(s => <option key={s}>{s}</option>)}</select>
          <select className="form-control" value={direction} onChange={e => setDirection(e.target.value)}><option value="">Incoming + outgoing</option><option value="outbound">Outgoing</option><option value="inbound">Incoming</option></select></>}
      </div>
      <div className="adm-card"><div className="ml-table-wrap"><table className="ml-table"><thead><tr><th>Subject</th><th>Direction</th><th>Address</th><th>Department</th><th>Status</th><th>When</th><th></th></tr></thead>
        <tbody>{list.rows.map(m => <tr key={m.id}><td>{m.subject}<div className="ml-muted">{m.skip_reason || m.error_code}</div></td><td>{m.direction}</td>
          <td>{m.direction === 'inbound' ? m.from_address : m.recipient_email}</td><td>{m.department || '—'}</td><td><Badge s={m.status} /></td><td>{fmt(m.created_at)}</td>
          <td><div className="ml-actions"><button className="btn btn-outline btn-sm" onClick={() => view(m)}>View</button>
            {canSend && m.status === 'failed' && <button className="btn btn-primary btn-sm" onClick={() => retry(m)}>Retry</button>}</div></td></tr>)}
          {!list.loading && list.rows.length === 0 && <tr><td colSpan={7} className="ml-muted">Nothing to show.</td></tr>}</tbody></table></div><Pager {...list} /></div>
      {open && <div className="ml-modal" onClick={() => setOpen(null)}><div className="ml-modal__box" onClick={e => e.stopPropagation()}>
        <h3>{open.subject}</h3><p className="ml-muted">{open.direction} · <Badge s={open.status} /> · {fmt(open.created_at)}{open.error_message ? ` · ${open.error_message}` : ''}</p>
        <div className="ml-body" dangerouslySetInnerHTML={{ __html: safeEmailHtml(open.body_html || '') }} />
        <div className="ml-actions" style={{ marginTop: '1rem' }}><button className="btn btn-outline" onClick={() => setOpen(null)}>Close</button></div></div></div>}
    </>
  );
}

// ── Departments & mailboxes ──────────────────────────────────────────────────────────────────────────────────────────────
function Departments({ canManage = true }) {
  const [depts, setDepts] = useState(null);
  const load = () => svc.departments().then(r => setDepts(r.data.departments)).catch(e => { setDepts([]); toast.error(errMsg(e, 'Not permitted')); });
  useEffect(() => { load(); }, []);
  const check = (m) => svc.checkMailbox(m.id).then(() => { toast.success('Checked with provider'); load(); }).catch(e => toast.error(errMsg(e)));
  const add = (d) => {
    const address = window.prompt('Mailbox address (e.g. name@yourdomain):'); if (!address) return;
    const display_name = window.prompt('Display name:') || address;
    const uid = window.prompt('Staff user ID this mailbox belongs to (blank for a department/role address):');
    svc.createMailbox(d.id, { address, display_name, provider: 'brevo', user_id: uid ? parseInt(uid, 10) : null }).then(() => { toast.success('Mailbox recorded — NOT connected until verified at the provider'); load(); }).catch(e => toast.error(errMsg(e)));
  };
  if (!depts) return <p className="ml-muted">Loading…</p>;
  return (
    <>
      <div className="ml-env-banner public"><FiShield /> A mailbox record is not a working mailbox. Status turns to “connected” only after the provider confirms the sender address. No passwords are stored or shared.</div>
      {depts.map(d => (
        <div className="adm-card" key={d.id} style={{ marginBottom: '1rem' }}>
          <div className="adm-card__header"><h3 className="adm-card__title">{d.name} <span className="badge badge-navy">{d.environment}</span></h3>{canManage && <button className="btn btn-outline btn-sm" onClick={() => add(d)}>Add mailbox</button>}</div>
          <p className="ml-muted">Members: {d.members.map(m => m.name).join(', ') || 'none'}</p>
          <div className="ml-table-wrap"><table className="ml-table"><thead><tr><th>Address</th><th>Owner</th><th>Provider</th><th>Connection</th><th></th></tr></thead>
            <tbody>{d.mailboxes.map(m => <tr key={m.id}><td>{m.address}<div className="ml-muted">{m.display_name}</div></td><td>{m.owner || 'Department address'}</td><td>{m.provider}</td>
              <td><span className={`badge ${m.connection_status === 'connected' ? 'badge-success' : m.connection_status === 'error' ? 'badge-danger' : 'badge-warning'}`}>{m.connection_status.replace('_', ' ')}</span>
                <div className="ml-muted">{m.last_check_error}</div></td>
              <td><div className="ml-actions">{canManage && <button className="btn btn-outline btn-sm" onClick={() => check(m)}>Check connection</button>}
                {canManage && m.is_active && <button className="btn btn-ghost btn-sm" onClick={() => window.confirm('Deactivate mailbox?') && svc.deactivateMailbox(m.id).then(load)}>Deactivate</button>}</div></td></tr>)}
              {d.mailboxes.length === 0 && <tr><td colSpan={5} className="ml-muted">No mailboxes.</td></tr>}</tbody></table></div>
        </div>))}
    </>
  );
}

function DepartmentHistory() {
  const [dept, setDept] = useState('');
  const list = useList((p) => svc.myMessages(p), { department_id: dept });
  return (<><div className="ml-filters"><input className="form-control" placeholder="Department ID (optional)" value={dept} onChange={e => setDept(e.target.value)} /></div>
    <div className="adm-card"><div className="ml-table-wrap"><table className="ml-table"><thead><tr><th>Subject</th><th>Dept</th><th>Direction</th><th>Assigned</th><th>Status</th><th>When</th></tr></thead>
      <tbody>{list.rows.map(m => <tr key={m.id}><td>{m.subject}</td><td>{m.department}</td><td>{m.direction}</td><td>{m.assignee || '—'}</td><td><Badge s={m.status} /></td><td>{fmt(m.created_at)}</td></tr>)}
        {!list.loading && list.rows.length === 0 && <tr><td colSpan={6} className="ml-muted">No department correspondence.</td></tr>}</tbody></table></div><Pager {...list} /></div></>);
}

function Audit() {
  const list = useList((p) => svc.audit(p), {});
  return <div className="adm-card"><div className="ml-table-wrap"><table className="ml-table"><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Environment</th><th>Subject</th></tr></thead>
    <tbody>{list.rows.map(a => <tr key={a.id}><td>{fmt(a.created_at)}</td><td>{a.actor || 'system'}</td><td>{a.action}</td><td>{a.environment || '—'}</td><td>{a.subject}</td></tr>)}
      {!list.loading && list.rows.length === 0 && <tr><td colSpan={5} className="ml-muted">No audit entries (or you lack audit access).</td></tr>}</tbody></table></div><Pager {...list} /></div>;
}

function Permissions() {
  const [data, setData] = useState(null);
  const load = () => svc.permissions().then(r => setData(r.data)).catch(e => { setData({ staff: [], available: [] }); toast.error(errMsg(e, 'Admin only')); });
  useEffect(() => { load(); }, []);
  if (!data) return <p className="ml-muted">Loading…</p>;
  const toggle = (u, p) => { const has = u.permissions.includes(p); const next = has ? u.permissions.filter(x => x !== p) : [...u.permissions, p]; svc.setPermissions(u.id, next).then(load).catch(e => toast.error(errMsg(e))); };
  return <div className="adm-card"><p className="ml-muted">Admins hold every permission. Grant non-admin staff only what their department needs; public and investor permissions are separate.</p>
    <div className="ml-table-wrap"><table className="ml-table"><thead><tr><th>Staff</th>{data.available.map(p => <th key={p}>{p}</th>)}</tr></thead>
      <tbody>{data.staff.map(u => <tr key={u.id}><td>{u.name}<div className="ml-muted">{u.role}</div></td>{data.available.map(p => <td key={p}><input type="checkbox" checked={u.permissions.includes(p)} onChange={() => toggle(u, p)} /></td>)}</tr>)}
        {data.staff.length === 0 && <tr><td colSpan={99} className="ml-muted">No non-admin staff.</td></tr>}</tbody></table></div></div>;
}

// ── Page ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// perms = null -> administrator (every tab/action). perms = array -> delegated staff: only what those grants allow. The API enforces the same rules.
export default function AdminMailing({ environment = 'public', perms = null }) {
  const env = environment;
  const can = (p) => perms === null || perms.includes(p);
  const [tab, setTab] = useState('overview');
  useEffect(() => { setTab('overview'); }, [env]);
  const v = can(`${env}.view`), m = can(`${env}.manage`);
  const TABS = [['overview', 'Overview', v], ['campaigns', 'Campaigns', v], ['templates', 'Templates', v], ['subscribers', env === 'public' ? 'Subscribers' : 'Investor consent', m], ['unsubscribes', 'Unsubscribes', m],
    ['messages', 'Delivery & history', v], ['failures', 'Failed emails', v], ['departments', 'Departments & mailboxes', can('departments.view') || can('departments.manage')], ['deptmail', 'Departmental history', true],
    ['audit', 'Audit trail', can('audit.view')], ['permissions', 'Permissions', perms === null]].filter(t => t[2]).map(t => [t[0], t[1]]);
  const active = TABS.some(t => t[0] === tab) ? tab : (TABS[0] ? TABS[0][0] : null);
  // The server decides; the UI offers every action and surfaces the server's refusal message.
  return (
    <div>
      <div className="adm-page-header"><div><h1>{env === 'public' ? 'General Public Mailing' : 'Investor Mailing'}</h1>
        <p>{env === 'public' ? 'Enquiries, registration correspondence, announcements and newsletters for visitors and non-investors.' : 'Communications for verified investors only.'}</p></div></div>
      <div className={`ml-env-banner ${env}`}>{env === 'public' ? <FiGlobe /> : <FiShield />}
        {env === 'public' ? 'Public environment — never include investor-only or confidential information. Verified investors are excluded from public campaigns.'
          : 'Investor environment — recipients are limited to verified, eligible investors. Optional mail needs consent; essential notices are restricted and audited.'}</div>
      <div className="ml-tabs">{TABS.map(([k, l]) => <button key={k} className={`ml-tab ${active === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>)}</div>
      {active === null && <p className="ml-muted">No mailing permissions have been assigned to your account for this environment.</p>}
      {active === 'overview' && <Overview env={env} />}
      {active === 'campaigns' && <Campaigns env={env} canSend={can(`${env}.send`)} canManage={m} />}
      {active === 'templates' && <Templates env={env} canManage={m} />}
      {active === 'subscribers' && <Subscribers env={env} canManage={m} />}
      {active === 'unsubscribes' && <Unsubscribes env={env} canManage={m} />}
      {active === 'messages' && <Messages env={env} canSend={can(`${env}.send`)} />}
      {active === 'failures' && <Messages env={env} failuresOnly canSend={can(`${env}.send`)} />}
      {active === 'departments' && <Departments canManage={can('departments.manage')} />}
      {active === 'deptmail' && <DepartmentHistory />}
      {active === 'audit' && <Audit />}
      {active === 'permissions' && <Permissions />}
    </div>
  );
}
