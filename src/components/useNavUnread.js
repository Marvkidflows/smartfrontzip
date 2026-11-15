// LOCATION: src/components/useNavUnread.js
import './MarvflowThread.css';
// Polls an unread-count endpoint for a sidebar badge. Quiet by design: only while the tab is visible, every 60 s, and any
// failure simply leaves the badge as it was (a badge must never break the layout).
import { useEffect, useState } from 'react';

export default function useNavUnread(fetchCount, intervalMs = 60000) {
  const [data, setData] = useState({ unread_count: 0 });

  useEffect(() => {
    let dead = false;
    const run = () => {
      if (document.visibilityState === 'hidden') return;
      Promise.resolve().then(fetchCount)
        .then((r) => { if (!dead && r?.data) setData(r.data); })
        .catch(() => { /* non-critical */ });
    };
    run();
    const timer = setInterval(run, intervalMs);
    const onVisible = () => { if (document.visibilityState === 'visible') run(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { dead = true; clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [fetchCount, intervalMs]);

  return data;
}
