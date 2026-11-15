// LOCATION: src/pages/marvflow/MarvflowProfile.jsx
//
// Mirrors FinancialProfile.jsx exactly — backed by
// MarvflowProfileController, which only ever touches Auth::user().
import { useState, useEffect } from 'react';
import { FiUser, FiMail, FiShield, FiLock } from 'react-icons/fi';
import { marvflowService } from '../../services/api';
import toast from 'react-hot-toast';
import '../admin/AdminPages.css';

export default function MarvflowProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ current_password: '', new_password: '', new_password_confirmation: '' });

  useEffect(() => {
    marvflowService.getProfile()
      .then(res => setProfile(res.data?.user))
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const submitPasswordChange = async (e) => {
    e.preventDefault();
    if (!form.current_password || !form.new_password) return;
    if (form.new_password !== form.new_password_confirmation) {
      toast.error('New password confirmation does not match.');
      return;
    }
    setSaving(true);
    try {
      await marvflowService.changePassword(form);
      toast.success('Password updated.');
      setForm({ current_password: '', new_password: '', new_password_confirmation: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="adm-page"><div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>Loading…</div></div>;
  }

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div>
          <h1>Profile</h1>
          <p>Your MarvFlow Team account</p>
        </div>
      </div>

      <div className="adm-card">
        <h3 className="adm-card__title">Account Information</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FiUser size={16} style={{ color: 'var(--gray-400)' }} />
            <span>{profile?.name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FiMail size={16} style={{ color: 'var(--gray-400)' }} />
            <span>{profile?.email}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FiShield size={16} style={{ color: 'var(--gray-400)' }} />
            <span>{profile?.role === 'marvflow_lead' ? 'MarvFlow Team Lead' : 'MarvFlow Team Member'}</span>
          </div>
        </div>
      </div>

      <div className="adm-card">
        <h3 className="adm-card__title"><FiLock size={15} style={{ marginRight: '0.4rem', verticalAlign: '-2px' }} />Change Password</h3>
        <form onSubmit={submitPasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxWidth: 380 }}>
          <div className="form-group">
            <label>Current Password</label>
            <input type="password" className="form-control" value={form.current_password}
              onChange={e => update('current_password', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input type="password" className="form-control" value={form.new_password}
              onChange={e => update('new_password', e.target.value)} minLength={8} required />
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <input type="password" className="form-control" value={form.new_password_confirmation}
              onChange={e => update('new_password_confirmation', e.target.value)} minLength={8} required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ alignSelf: 'flex-start' }}>
            {saving ? 'Saving…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
