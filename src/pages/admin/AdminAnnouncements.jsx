// LOCATION: src/pages/admin/AdminAnnouncements.jsx
//
// Admin side of the News & Information Centre. Extends the original
// announcements manager (same route, same table) rather than replacing it.

import { useState, useEffect } from 'react';
import { FiEdit2, FiTrash2, FiPlus, FiImage, FiEye, FiEyeOff } from 'react-icons/fi';
import { adminService } from '../../services/api';
import toast from 'react-hot-toast';
import './AdminPages.css';

const CATEGORIES = [
  { value: 'company_announcement',  label: 'Company Announcement', icon: '📢' },
  { value: 'platform_update',       label: 'Platform Update',      icon: '🛠️' },
  { value: 'important_notice',      label: 'Important Notice',     icon: '⚠️' },
  { value: 'investor_information',  label: 'Investor Information', icon: 'ℹ️' },
  { value: 'project_update',        label: 'Project Update',       icon: '📈' },
  { value: 'general_communication', label: 'General',               icon: '💬' },
  { value: 'other',                 label: 'Other',                  icon: '📄' },
];
const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.value, c]));

const STATUS_META = {
  draft:       { label: 'Draft',       color: 'navy'    },
  scheduled:   { label: 'Scheduled',   color: 'warning' },
  published:   { label: 'Published',   color: 'success' },
  unpublished: { label: 'Unpublished', color: 'danger'  },
};

const emptyForm = {
  title: '', summary: '', content: '', category: 'general_communication',
  status: 'published', scheduled_at: '', is_popup: false, is_featured: false, image: null,
};

function NewsFormModal({ item, onClose, onSaved }) {
  const isEdit = !!item;
  const [form, setForm] = useState(item ? {
    title: item.title || '', summary: item.summary || '', content: item.content || item.message || '',
    category: item.category || 'general_communication', status: item.status || 'published',
    scheduled_at: item.scheduled_at ? item.scheduled_at.slice(0, 16) : '',
    is_popup: !!item.is_popup, is_featured: !!item.is_featured, image: null,
  } : emptyForm);
  const [preview, setPreview] = useState(item?.image_url || null);
  const [saving, setSaving] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setForm(f => ({ ...f, image: file }));
    setPreview(URL.createObjectURL(file));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Title and content are required.');
      return;
    }
    if (form.status === 'scheduled' && !form.scheduled_at) {
      toast.error('Pick a date/time to schedule this for.');
      return;
    }

    setSaving(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v === null || v === '') return;
        payload.append(k, typeof v === 'boolean' ? (v ? '1' : '0') : v);
      });

      if (isEdit) {
        await adminService.updateAnnouncement(item.id, payload);
        toast.success('News item updated.');
      } else {
        await adminService.storeAnnouncement(payload);
        toast.success(form.status === 'draft' ? 'Draft saved.' : 'News item created.');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save news item.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" style={{ maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h3>{isEdit ? 'Edit News Item' : 'New News Item'}</h3>
        <form onSubmit={handleSave} style={{ marginTop: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Featured Image (optional)</label>
            <label style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              height: preview ? 'auto' : 90, border: '1.5px dashed var(--gray-300)', borderRadius: 'var(--radius-md)',
              cursor: 'pointer', overflow: 'hidden', color: 'var(--gray-400)', fontSize: '0.82rem',
            }}>
              {preview
                ? <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 180, objectFit: 'cover' }} />
                : <><FiImage size={18} /> Click to upload an image</>}
              <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
            </label>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Category</label>
              <select className="form-control" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Status</label>
              <select className="form-control" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="scheduled">Scheduled</option>
                <option value="unpublished">Unpublished</option>
              </select>
            </div>
          </div>

          {form.status === 'scheduled' && (
            <div className="form-group">
              <label className="form-label">Publish At</label>
              <input type="datetime-local" className="form-control" value={form.scheduled_at}
                onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="form-control" required placeholder="e.g. Platform Maintenance Notice"
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>

          <div className="form-group">
            <label className="form-label">Summary <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>(optional — shown in the list view)</span></label>
            <input className="form-control" maxLength={500} value={form.summary}
              onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} />
          </div>

          <div className="form-group">
            <label className="form-label">Content</label>
            <textarea className="form-control" rows={5} required placeholder="Full body…"
              value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              style={{ resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_popup} onChange={e => setForm(f => ({ ...f, is_popup: e.target.checked }))} />
              Show as popup
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} />
              Mark as featured
            </label>
          </div>

          <div className="adm-modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminAnnouncements() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchItems = () => {
    adminService.getAnnouncements()
      .then(res => setItems(res.data?.announcements || []))
      .catch(() => toast.error('Failed to load news items'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchItems(); }, []);

  const openNew  = () => { setModal(null); setShowModal(true); };
  const openEdit = (a) => { setModal(a);   setShowModal(true); };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this news item permanently?')) return;
    try {
      await adminService.deleteAnnouncement(id);
      setItems(a => a.filter(x => x.id !== id));
      toast.success('Deleted.');
    } catch { toast.error('Failed to delete.'); }
  };

  const togglePublish = async (a) => {
    try {
      if (a.status === 'published') {
        await adminService.unpublishAnnouncement(a.id);
        toast.success('Unpublished.');
      } else {
        await adminService.publishAnnouncement(a.id);
        toast.success('Published.');
      }
      fetchItems();
    } catch { toast.error('Failed to update status.'); }
  };

  const filtered = statusFilter ? items.filter(a => a.status === statusFilter) : items;

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div><h1>News &amp; Information Centre</h1><p>Create and publish news, updates, and notices for investors</p></div>
        <button className="btn btn-gold" onClick={openNew}><FiPlus /> New News Item</button>
      </div>

      <div className="adm-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h3 className="adm-card__title" style={{ margin: 0 }}>All News Items</h3>
          <select className="form-control" style={{ width: 180 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="adm-empty"><p>No news items yet.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filtered.map(a => {
              const cat = CATEGORY_MAP[a.category] || CATEGORY_MAP.other;
              const status = STATUS_META[a.status] || STATUS_META.draft;
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1.25rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-200)' }}>
                  {a.image_url
                    ? <img src={a.image_url} alt="" style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', objectFit: 'cover', flexShrink: 0 }} />
                    : <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{cat.icon}</span>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--navy)' }}>{a.title}</strong>
                      <span className={`badge badge-${status.color}`}>{status.label}</span>
                      <span className="badge badge-info">{cat.icon} {cat.label}</span>
                      {a.is_featured && <span className="badge" style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold)' }}>Featured</span>}
                      {a.is_popup && <span className="badge badge-danger">Popup</span>}
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', margin: 0 }}>{a.summary || a.content}</p>
                    <small style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                      {a.author ? `${a.author} · ` : ''}{a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}
                      {a.status === 'scheduled' && a.scheduled_at && ` · publishes ${new Date(a.scheduled_at).toLocaleString()}`}
                    </small>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                    <button className="btn btn-ghost btn-sm" title={a.status === 'published' ? 'Unpublish' : 'Publish'} onClick={() => togglePublish(a)}>
                      {a.status === 'published' ? <FiEyeOff size={13} /> : <FiEye size={13} />}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(a)}><FiEdit2 size={13} /></button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a.id)}><FiTrash2 size={13} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <NewsFormModal item={modal} onClose={() => setShowModal(false)} onSaved={fetchItems} />
      )}
    </div>
  );
}
