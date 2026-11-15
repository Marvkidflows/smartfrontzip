// Delegated-staff mailing screen (Financial / MarvFlow / Registration). Shows ONLY the environments and tabs the user's grants allow.
// No permission editor, no admin-only controls. Registration roles are never offered the investor environment (and the API refuses it anyway).
import { useEffect, useState } from 'react';
import { mailingService } from '../../services/mailingApi';
import AdminMailing from '../admin/AdminMailing';

export default function StaffMailing() {
  const [me, setMe] = useState(null);
  const [env, setEnv] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    mailingService.myPermissions().then(r => {
      setMe(r.data);
      const p = r.data.permissions || [];
      setEnv(p.some(x => x.startsWith('public.')) ? 'public' : p.some(x => x.startsWith('investor.')) ? 'investor' : 'public');
    }).catch(() => setErr(true));
  }, []);

  if (err) return <p className="ml-muted" style={{ padding: '1.5rem' }}>Mailing is not available for your account.</p>;
  if (!me) return <p className="ml-muted" style={{ padding: '1.5rem' }}>Loading…</p>;

  const perms = me.permissions || [];
  const hasPublic = perms.some(x => x.startsWith('public.')) || perms.some(x => ['departments.view', 'departments.manage', 'audit.view'].includes(x)) || (me.department_ids || []).length > 0;
  const hasInvestor = perms.some(x => x.startsWith('investor.'));
  if (!hasPublic && !hasInvestor) return <p className="ml-muted" style={{ padding: '1.5rem' }}>No mailing permissions have been assigned to your account. Ask an administrator.</p>;

  return (
    <div>
      {hasPublic && hasInvestor && (
        <div className="ml-tabs" style={{ marginBottom: '0.5rem' }}>
          <button className={`ml-tab ${env === 'public' ? 'active' : ''}`} onClick={() => setEnv('public')}>General Public</button>
          <button className={`ml-tab ${env === 'investor' ? 'active' : ''}`} onClick={() => setEnv('investor')}>Investor</button>
        </div>
      )}
      <AdminMailing environment={env === 'investor' && hasInvestor ? 'investor' : 'public'} perms={perms} />
    </div>
  );
}
