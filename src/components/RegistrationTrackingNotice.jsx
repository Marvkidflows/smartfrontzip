// LOCATION: src/components/RegistrationTrackingNotice.jsx
//
// Task 2 — privacy disclosure + consent for registration-page tracking. Rendered ONLY when the server reports tracking as enabled, and
// hidden once the visitor has chosen. Registration works identically whichever option is picked.
import { useEffect, useState } from 'react';
import { authService } from '../services/api';
import { allow, decline, getChoice, recordReturningVisit } from '../utils/registrationTracking';

export default function RegistrationTrackingNotice() {
  const [enabled, setEnabled] = useState(false);
  const [choice, setChoice] = useState(getChoice());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    authService.getTrackingNotice()
      .then(res => {
        if (!alive) return;
        setEnabled(!!res.data?.enabled);
        if (res.data?.enabled && getChoice() === 'allow') recordReturningVisit(authService.recordRegistrationVisit);
      })
      .catch(() => { /* no notice, no tracking */ });
    return () => { alive = false; };
  }, []);

  if (!enabled || choice) return null;

  const onAllow = async () => {
    setBusy(true);
    try { await allow(authService.recordRegistrationVisit); } catch { /* ignore: choice is still remembered */ }
    setChoice('allow'); setBusy(false);
  };
  const onDecline = () => { decline(); setChoice('decline'); };

  return (
    <section className="privacy-panel" role="region" aria-label="Registration visit tracking notice" style={{ marginBottom: '1rem' }}>
      <strong>Help us support your registration</strong>
      <p style={{ margin: '0.4rem 0 0.75rem', fontSize: '0.85rem' }}>
        With your permission, our Registration Team is told when someone opens this page, so we can help people who need assistance.
        We store a random code (not your name, IP address or device details). Choosing “No thanks” does not affect your registration in any way.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-primary btn-sm" onClick={onAllow} disabled={busy}>Allow</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDecline} disabled={busy}>No thanks</button>
      </div>
    </section>
  );
}
