// Integration: tells a department layout whether THIS staff member holds any mailing / news permission, so the menu only offers screens
// they can actually use. This is presentation only — every API route re-checks the same permissions on the server.
import { useEffect, useState } from 'react';
import { mailingService } from '../services/mailingApi';
import { newsAdmin } from '../services/newsApi';

const cache = new Map();   // user id -> { mail, news }   (cleared on page reload / login switch because the key is the user id)

export default function useStaffAccess(user) {
  const key = user?.id ?? null;
  const [state, setState] = useState(() => (key !== null && cache.get(key)) || { loading: true, mail: null, news: null });

  useEffect(() => {
    if (key === null) return undefined;
    if (cache.has(key)) { setState(cache.get(key)); return undefined; }
    let live = true;
    Promise.allSettled([mailingService.myPermissions(), newsAdmin.myPermissions()]).then(([m, n]) => {
      const next = {
        loading: false,
        mail: m.status === 'fulfilled' ? m.value.data : null,   // { permissions, department_ids, is_admin }
        news: n.status === 'fulfilled' ? n.value.data : null,   // { permissions, department, is_admin }
      };
      cache.set(key, next);
      if (live) setState(next);
    });
    return () => { live = false; };
  }, [key]);

  const mailPerms = state.mail?.permissions || [];
  const newsPerms = state.news?.permissions || [];
  return {
    loading: state.loading,
    mailPerms, newsPerms,
    canMail: mailPerms.length > 0 || (state.mail?.department_ids?.length || 0) > 0,
    canNews: newsPerms.length > 0,
  };
}
