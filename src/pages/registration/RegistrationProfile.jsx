// LOCATION: src/pages/registration/RegistrationProfile.jsx
// Registration staff change their own password. Server rules: current password required, new password must differ, other sessions are signed out.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { registrationService } from '../../services/api';
import useAuthStore from '../../store/authStore';
import '../admin/AdminPages.css';
import './RegistrationPages.css';

export default function RegistrationProfile() {
  const { user } = useAuthStore();
  const [f, setF] = useState({ current: '', next: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (f.next.length < 8) return setError('The new password must be at least 8 characters.');
    if (f.next !== f.confirm) return setError('The new passwords do not match.');
    if (f.next === f.current) return setError('The new password must be different from the current one.');
    setBusy(true);
    try {
      await registrationService.changePassword(f.current, f.next, f.confirm);
      toast.success('Password updated. Other sessions were signed out.');
      setF({ current: '', next: '', confirm: '' });
    } catch (err) {
      const d = err.response?.data;
      setError(d?.errors ? Object.values(d.errors).flat().join(' ') : (d?.message || 'Could not change the password.'));
    } finally { setBusy(false); }
  };

  return (
    <div className="adm-page">
      <div className="adm-page-header"><div><h1>My account</h1><p>{user?.name} · {user?.email}</p></div></div>
      <div className="adm-card" style={{ maxWidth: 460 }}>
        <form onSubmit={submit}>
          <label className="form-label">Current password</label>
          <input className="form-control" type="password" autoComplete="current-password" value={f.current} onChange={set('current')} required />
          <label className="form-label" style={{ marginTop: '0.75rem' }}>New password</label>
          <input className="form-control" type="password" autoComplete="new-password" value={f.next} onChange={set('next')} required minLength={8} />
          <label className="form-label" style={{ marginTop: '0.75rem' }}>Confirm new password</label>
          <input className="form-control" type="password" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} required />
          {error && <div role="alert" style={{ color: 'var(--danger)', marginTop: '0.75rem' }}>{error}</div>}
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button>
        </form>
      </div>
    </div>
  );
}
