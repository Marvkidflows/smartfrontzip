// LOCATION: src/components/tasks/TaskCountdown.jsx
//
// Guide §11 / brief §22: this is a VISUAL INDICATOR ONLY. It ticks down
// locally from the seconds_remaining value the server returned, purely for
// display. It never decides whether a task is actually active/expired —
// that's enforced server-side (InvestorTask::syncExpiry()) on every read
// and action. When the local timer hits zero, we simply notify the parent
// to re-fetch from the server, which is the source of truth.

import { useState, useEffect, useRef } from 'react';
import { FiClock } from 'react-icons/fi';

function formatDuration(totalSeconds) {
  if (totalSeconds == null || totalSeconds <= 0) return '00:00:00';
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const pad = (n) => String(n).padStart(2, '0');
  return days > 0
    ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export default function TaskCountdown({ secondsRemaining, onExpire, compact = false, label = 'Time Remaining' }) {
  const [remaining, setRemaining] = useState(secondsRemaining ?? 0);
  const firedExpire = useRef(false);

  useEffect(() => {
    setRemaining(secondsRemaining ?? 0);
    firedExpire.current = false;
  }, [secondsRemaining]);

  useEffect(() => {
    if (remaining <= 0) {
      if (!firedExpire.current && secondsRemaining != null) {
        firedExpire.current = true;
        onExpire?.();
      }
      return;
    }
    const timer = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(timer);
  }, [remaining > 0]);

  if (secondsRemaining == null) return null;

  const isUrgent = remaining > 0 && remaining < 300; // < 5 minutes

  if (compact) {
    return (
      <span style={{ fontWeight: 700, color: remaining <= 0 ? 'var(--danger)' : isUrgent ? 'var(--warning)' : 'var(--navy)' }}>
        {formatDuration(remaining)}
      </span>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      color: remaining <= 0 ? 'var(--danger)' : isUrgent ? 'var(--warning)' : 'var(--navy)',
    }}>
      <FiClock size={15} />
      <div>
        <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>
          {label}
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
          {formatDuration(remaining)}
        </div>
      </div>
    </div>
  );
}
