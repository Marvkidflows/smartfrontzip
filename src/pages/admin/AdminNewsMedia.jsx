// TASK 4 — News & Media administration: articles, editor (images / video / embeds / scheduling), moderation queue, media library,
// categories, permissions, audit. All authorisation is enforced by the API; the UI surfaces the server's refusals.
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import toast from 'react-hot-toast';
import { newsAdmin as api } from '../../services/newsApi';
import { NewsVideo } from '../../components/news/NewsParts';
import './AdminPages.css';
import './AdminNewsMedia.css';

const errMsg = (e, f = 'Something went wrong') => { const d = e?.response?.data; return (d?.errors && Object.values(d.errors).flat()[0]) || d?.message || f; };
const fmt = (d) => (d ? new Date(d).toLocaleString() : '—');
const BADGE = { draft: 'badge-navy', submitted: 'badge-warning', approved: 'badge-info', rejected: 'badge-danger', scheduled: 'badge-info', published: 'badge-success', unpublished: 'badge-gold', pending: 'badge-warning' };
const Badge = ({ s }) => <span className={`badge ${BADGE[s] || 'badge-navy'}`}>{s}</span>;
const TYPES = ['article', 'announcement', 'market_news', 'educational', 'video', 'promotion', 'investor_notice'];
const VIS = { public: 'Public (everyone)', members: 'Signed-in members', investor: 'Verified investors only' };

// Permission context: null = admin (every action offered). Delegated staff get only the actions their grants allow; the API enforces the same rules.
const CanCtx = createContext(() => true);
const useCan = () => useContext(CanCtx);

function useList(fetcher, filters) {
  const [rows, setRows] = useState([]); const [meta, setMeta] = useState(null); const [page, setPage] = useState(1); const [loading, setLoading] = useState(true);
  const key = JSON.stringify(filters);
  const load = useCallback(() => {
    setLoading(true);
    fetcher({ ...filters, page }).then(r => { setRows(r.data.data || []); setMeta(r.data); }).catch(e => toast.error(errMsg(e, 'Could not load'))).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, page]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [key]);
  return { rows, meta, page, setPage, loading, reload: load };
}
const Pager = ({ page, setPage, meta }) => (meta && meta.last_page > 1) ? (
  <div className="ml-pager"><button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
    <span className="ml-muted">Page {meta.current_page} of {meta.last_page}</span>
    <button className="btn btn-outline btn-sm" disabled={page >= meta.last_page} onClick={() => setPage(page + 1)}>Next</button></div>) : null;

// ── Editor ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function Editor({ article, categories, onClose, onSaved }) {
  const can = useCan();
  const [f, setF] = useState(article || { title: '', summary: '', body: '', content_type: 'article', visibility: 'public', category_id: categories[0]?.id || '', cover_media_id: null, video_media_id: null, is_featured: false });
  const [cover, setCover] = useState(article?.cover || null); const [video, setVideo] = useState(article?.video || null);
  const [embedUrl, setEmbedUrl] = useState(''); const [busy, setBusy] = useState(false); const [at, setAt] = useState('');
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));

  const upImage = async (file) => { if (!file) return; setBusy(true); try { const r = await api.uploadImage(file, f.title); setCover(r.data.media); set('cover_media_id', r.data.media.id); toast.success(r.data.media.status === 'pending' ? 'Image uploaded — awaiting moderation' : 'Image uploaded'); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); } };
  const upVideo = async (file) => { if (!file) return; setBusy(true); try { const r = await api.uploadVideo(file); setVideo(r.data.media); set('video_media_id', r.data.media.id); toast.success('Video uploaded'); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); } };
  const addEmbed = async () => { try { const r = await api.embed(embedUrl); setVideo(r.data.media); set('video_media_id', r.data.media.id); setEmbedUrl(''); toast.success('Video link added'); } catch (e) { toast.error(errMsg(e)); } };

  const payload = () => ({ title: f.title, summary: f.summary || null, body: f.body, content_type: f.content_type, visibility: f.visibility, category_id: f.category_id || null, cover_media_id: f.cover_media_id, video_media_id: f.video_media_id, is_featured: !!f.is_featured });
  const save = async (after) => {
    setBusy(true);
    try {
      const r = f.id ? await api.update(f.id, payload()) : await api.create(payload());
      const id = r.data.article.id;
      if (after === 'submit') await api.submit(id);
      if (after === 'publish') await api.publish(id, at ? new Date(at).toISOString() : null);
      toast.success(after === 'submit' ? 'Submitted for review' : after === 'publish' ? (at ? 'Scheduled' : 'Published') : 'Saved'); onSaved();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div className="ml-modal" onClick={onClose}><div className="ml-modal__box" style={{ maxWidth: 860 }} onClick={e => e.stopPropagation()}>
      <h3>{f.id ? 'Edit article' : 'New article'}</h3>
      {f.review_note && f.status === 'rejected' && <div className="ml-env-banner investor">Reviewer note: {f.review_note}</div>}
      <div className="ml-form" style={{ maxWidth: 'none' }}>
        <div className="form-group"><label className="form-label">Title</label><input className="form-control" maxLength={190} value={f.title} onChange={e => set('title', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Summary (shown on cards)</label><input className="form-control" maxLength={500} value={f.summary || ''} onChange={e => set('summary', e.target.value)} /></div>
        <div className="ml-row">
          <div className="form-group"><label className="form-label">Content type</label><select className="form-control" value={f.content_type} onChange={e => set('content_type', e.target.value)}>{TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Category</label><select className="form-control" value={f.category_id || ''} onChange={e => set('category_id', e.target.value)}><option value="">—</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        </div>
        <div className="form-group"><label className="form-label">Who can see it</label><select className="form-control" value={f.visibility} onChange={e => set('visibility', e.target.value)}>{Object.entries(VIS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          {f.visibility === 'investor' && <div className="ml-muted">Only verified, eligible investors will ever receive this article or its media.</div>}</div>
        <div className="form-group"><label className="form-label">Body (HTML; unsafe markup is removed on save)</label><textarea className="form-control" rows={10} value={f.body} onChange={e => set('body', e.target.value)} /></div>

        <div className="nm-media">
          <div><label className="form-label">Cover image (JPG / PNG / WebP, max 5 MB)</label>
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => upImage(e.target.files[0])} />
            {cover?.url && <img src={cover.url} alt="" className="nm-thumb" />}{cover && <div className="ml-muted">Status: {cover.status}</div>}</div>
          <div><label className="form-label">Video — upload (MP4 / WebM, max 50 MB) or paste a YouTube / Vimeo link</label>
            <input type="file" accept="video/mp4,video/webm" disabled={busy} onChange={e => upVideo(e.target.files[0])} />
            <div style={{ display: 'flex', gap: '.5rem', marginTop: '.5rem' }}><input className="form-control" placeholder="https://www.youtube.com/watch?v=…" value={embedUrl} onChange={e => setEmbedUrl(e.target.value)} /><button className="btn btn-outline btn-sm" onClick={addEmbed} disabled={!embedUrl}>Add link</button></div>
            {video && <><NewsVideo video={video} /><div className="ml-muted">Status: {video.status} <button className="btn btn-ghost btn-sm" onClick={() => { setVideo(null); set('video_media_id', null); }}>Remove</button></div></>}</div>
        </div>
        {can('news.publish') && <label><input type="checkbox" checked={!!f.is_featured} onChange={e => set('is_featured', e.target.checked)} /> Feature at the top of the feed (publishers only)</label>}
        <div className="ml-actions">
          <button className="btn btn-outline" disabled={busy} onClick={() => save()}>Save draft</button>
          <button className="btn btn-primary" disabled={busy} onClick={() => save('submit')}>Submit for review</button>
          {can('news.publish') && <><input type="datetime-local" className="form-control" style={{ width: 210 }} value={at} onChange={e => setAt(e.target.value)} title="Leave empty to publish immediately" />
          <button className="btn btn-gold" disabled={busy} onClick={() => save('publish')}>{at ? 'Schedule' : 'Publish now'}</button></>}
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
        <div className="ml-muted">Publishing and scheduling need the publisher permission; contributors submit for review.</div>
      </div></div></div>
  );
}

// ── Articles + moderation ────────────────────────────────────────────────────────────────────────────────────────────────
function Articles({ categories, moderation }) {
  const can = useCan();
  const [status, setStatus] = useState(moderation ? 'submitted' : ''); const [q, setQ] = useState(''); const [visibility, setVisibility] = useState(''); const [edit, setEdit] = useState(null);
  const list = useList((p) => api.articles(p), { status, q, visibility });
  const act = async (fn, ok) => { try { await fn(); toast.success(ok); list.reload(); } catch (e) { toast.error(errMsg(e)); } };
  const open = (id) => api.article(id).then(r => setEdit(r.data.article)).catch(e => toast.error(errMsg(e)));
  const reject = (a) => { const note = window.prompt('What should the author change? (required)'); if (note) act(() => api.reject(a.id, note), 'Rejected'); };
  return (
    <>
      <div className="ml-filters">
        <input className="form-control" placeholder="Search title / author…" value={q} onChange={e => setQ(e.target.value)} />
        {!moderation && <select className="form-control" value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{['draft', 'submitted', 'approved', 'rejected', 'scheduled', 'published', 'unpublished'].map(s => <option key={s}>{s}</option>)}</select>}
        <select className="form-control" value={visibility} onChange={e => setVisibility(e.target.value)}><option value="">All audiences</option>{Object.entries(VIS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        {!moderation && <button className="btn btn-primary btn-sm" onClick={() => setEdit(false)}>New article</button>}
      </div>
      <div className="adm-card"><div className="ml-table-wrap"><table className="ml-table"><thead><tr><th>Title</th><th>Audience</th><th>Author</th><th>Status</th><th>Date</th><th></th></tr></thead>
        <tbody>{list.rows.map(a => (
          <tr key={a.id}><td><b>{a.title}</b><div className="ml-muted">{a.category?.name} · {a.content_type.replace('_', ' ')}{a.review_note ? ` · note: ${a.review_note}` : ''}</div></td>
            <td>{a.visibility}</td><td>{a.author_name}<div className="ml-muted">{a.department}</div></td><td><Badge s={a.status} /></td><td>{fmt(a.published_at || a.scheduled_at || a.updated_at)}</td>
            <td><div className="ml-actions">
              <button className="btn btn-outline btn-sm" onClick={() => open(a.id)}>{moderation ? 'Review' : 'Edit'}</button>
              {can('news.review') && a.status === 'submitted' && <><button className="btn btn-success btn-sm" onClick={() => act(() => api.approve(a.id), 'Approved')}>Approve</button><button className="btn btn-danger btn-sm" onClick={() => reject(a)}>Reject</button></>}
              {can('news.publish') && ['approved', 'unpublished'].includes(a.status) && <button className="btn btn-primary btn-sm" onClick={() => act(() => api.publish(a.id), 'Published')}>Publish</button>}
              {can('news.publish') && ['published', 'scheduled'].includes(a.status) && <button className="btn btn-outline btn-sm" onClick={() => act(() => api.unpublish(a.id), 'Unpublished')}>Unpublish</button>}
              {!moderation && <button className="btn btn-ghost btn-sm" onClick={() => window.confirm('Remove this article?') && act(() => api.remove(a.id), 'Removed')}>Remove</button>}
            </div></td></tr>))}
          {!list.loading && list.rows.length === 0 && <tr><td colSpan={6} className="ml-muted">{moderation ? 'Nothing waiting for review.' : 'No articles.'}</td></tr>}</tbody></table></div><Pager {...list} /></div>
      {edit !== null && <Editor article={edit || null} categories={categories} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); list.reload(); }} />}
    </>
  );
}

// ── Media library ────────────────────────────────────────────────────────────────────────────────────────────────────────
function MediaLibrary() {
  const can = useCan();
  const [status, setStatus] = useState('');
  const list = useList((p) => api.media(p), { status });
  const act = (fn, ok) => fn().then(() => { toast.success(ok); list.reload(); }).catch(e => toast.error(errMsg(e)));
  return (<>
    <div className="ml-filters"><select className="form-control" value={status} onChange={e => setStatus(e.target.value)}><option value="">All</option><option>pending</option><option>approved</option><option>rejected</option></select></div>
    <div className="nm-grid">{list.rows.map(m => (
      <div className="adm-card nm-item" key={m.id}>
        {m.kind === 'image' && <img src={m.url} alt={m.alt || ''} className="nm-thumb" />}
        {m.kind !== 'image' && <NewsVideo video={m} />}
        <div className="ml-muted">{m.original_name || m.embed_url} · {m.uploaded_by}</div><Badge s={m.status} />
        <div className="ml-actions" style={{ marginTop: '.5rem' }}>
          {can('news.review') && m.status !== 'approved' && <button className="btn btn-success btn-sm" onClick={() => act(() => api.approveMedia(m.id), 'Approved')}>Approve</button>}
          {can('news.review') && m.status !== 'rejected' && <button className="btn btn-danger btn-sm" onClick={() => act(() => api.rejectMedia(m.id), 'Rejected')}>Reject</button>}
          <button className="btn btn-ghost btn-sm" onClick={() => window.confirm('Delete this file?') && act(() => api.deleteMedia(m.id), 'Deleted')}>Delete</button>
        </div></div>))}
      {!list.loading && list.rows.length === 0 && <p className="ml-muted">No media.</p>}</div><Pager {...list} /></>);
}

function Categories({ categories, reload }) {
  const can = useCan();
  const [name, setName] = useState('');
  const add = () => api.createCategory({ name }).then(() => { setName(''); reload(); toast.success('Category added'); }).catch(e => toast.error(errMsg(e)));
  const toggle = (c) => api.updateCategory(c.id, { is_active: !c.is_active }).then(reload).catch(e => toast.error(errMsg(e)));
  return <div className="adm-card">{can('news.manage') && <div className="ml-filters"><input className="form-control" placeholder="New category" value={name} onChange={e => setName(e.target.value)} /><button className="btn btn-primary btn-sm" disabled={!name} onClick={add}>Add</button></div>}
    <table className="ml-table"><tbody>{categories.map(c => <tr key={c.id}><td>{c.name}</td><td>{c.slug}</td><td>{can('news.manage') && <button className="btn btn-outline btn-sm" onClick={() => toggle(c)}>{c.is_active ? 'Deactivate' : 'Activate'}</button>}</td></tr>)}</tbody></table></div>;
}

function Permissions() {
  const [d, setD] = useState(null);
  const load = () => api.permissions().then(r => setD(r.data)).catch(e => { setD({ staff: [], available: [] }); toast.error(errMsg(e, 'Admin only')); });
  useEffect(() => { load(); }, []);
  if (!d) return <p className="ml-muted">Loading…</p>;
  const toggle = (u, p) => api.setPermissions(u.id, u.permissions.includes(p) ? u.permissions.filter(x => x !== p) : [...u.permissions, p]).then(load).catch(e => toast.error(errMsg(e)));
  return <div className="adm-card"><p className="ml-muted">contribute = submit own work · edit = edit any article · review = approve/reject submissions &amp; media · publish = publish/schedule/unpublish · manage = remove content, categories, audit. Admins hold all.</p>
    <div className="ml-table-wrap"><table className="ml-table"><thead><tr><th>Staff</th>{d.available.map(p => <th key={p}>{p.replace('news.', '')}</th>)}</tr></thead>
      <tbody>{d.staff.map(u => <tr key={u.id}><td>{u.name}<div className="ml-muted">{u.role}</div></td>{d.available.map(p => <td key={p}><input type="checkbox" checked={u.permissions.includes(p)} onChange={() => toggle(u, p)} /></td>)}</tr>)}</tbody></table></div></div>;
}

function Audit() {
  const list = useList((p) => api.audit(p), {});
  return <div className="adm-card"><table className="ml-table"><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Subject</th></tr></thead>
    <tbody>{list.rows.map(a => <tr key={a.id}><td>{fmt(a.created_at)}</td><td>{a.actor || 'system'}</td><td>{a.action}</td><td>{a.subject}</td></tr>)}
      {!list.loading && list.rows.length === 0 && <tr><td colSpan={4} className="ml-muted">No entries (or no audit access).</td></tr>}</tbody></table><Pager {...list} /></div>;
}

// perms = null -> administrator (everything). perms = array -> delegated staff: only tabs/actions those grants allow (server enforces regardless).
export default function AdminNewsMedia({ perms = null }) {
  const can = (p) => perms === null || perms.includes(p);
  const [tab, setTab] = useState('articles'); const [categories, setCategories] = useState([]);
  const loadCats = () => api.categories().then(r => setCategories(r.data.categories)).catch(() => {});
  useEffect(() => { loadCats(); }, []);
  const ALL_TABS = [['articles', 'Articles', true], ['moderation', 'Moderation queue', can('news.review')], ['media', 'Media library', true], ['categories', 'Categories', true],
    ['permissions', 'Permissions', perms === null], ['audit', 'Audit trail', can('news.manage')]];
  const TABS = ALL_TABS.filter(t => t[2]);
  return (
    <CanCtx.Provider value={can}>
    <div>
      <div className="adm-page-header"><div><h1>News &amp; Media</h1><p>Publish updates, market news, educational content and videos to the public site and the investor dashboard.</p></div></div>
      <div className="ml-tabs">{TABS.map(([k, l]) => <button key={k} className={`ml-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === 'articles' && <Articles categories={categories.filter(c => c.is_active)} />}
      {tab === 'moderation' && <Articles categories={categories} moderation />}
      {tab === 'media' && <MediaLibrary />}
      {tab === 'categories' && <Categories categories={categories} reload={loadCats} />}
      {tab === 'permissions' && <Permissions />}
      {tab === 'audit' && <Audit />}
    </div>
    </CanCtx.Provider>
  );
}
