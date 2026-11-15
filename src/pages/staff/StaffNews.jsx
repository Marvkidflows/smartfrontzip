// Delegated-staff News & Media screen. Contributors submit for review; reviewers/publishers see only the actions their grants allow.
import { useEffect, useState } from 'react';
import { newsAdmin } from '../../services/newsApi';
import AdminNewsMedia from '../admin/AdminNewsMedia';

export default function StaffNews() {
  const [me, setMe] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => { newsAdmin.myPermissions().then(r => setMe(r.data)).catch(() => setErr(true)); }, []);
  if (err) return <p className="ml-muted" style={{ padding: '1.5rem' }}>News & Media is not available for your account.</p>;
  if (!me) return <p className="ml-muted" style={{ padding: '1.5rem' }}>Loading…</p>;
  if (!(me.permissions || []).length) return <p className="ml-muted" style={{ padding: '1.5rem' }}>No news permissions have been assigned to your account. Ask an administrator.</p>;
  return <AdminNewsMedia perms={me.permissions} />;
}
