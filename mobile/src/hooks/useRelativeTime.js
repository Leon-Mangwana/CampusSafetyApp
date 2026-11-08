import { useEffect, useState } from 'react';

export const formatRelativeTime = (iso, now = Date.now()) => {
  if (!iso) return 'never';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 'unknown';
  const seconds = Math.max(0, Math.floor((now - t) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hoursAgo = Math.floor(minutes / 60);
  if (hoursAgo < 24) return `${hoursAgo}h ago`;
  return `${Math.floor(hoursAgo / 24)}d ago`;
};

/**
 * Returns `Date.now()` refreshed every `tickMs` so relative-time labels
 * ("Updated 12s ago") tick without re-rendering the whole screen from a
 * parent. Use the returned value as the `now` argument to formatRelativeTime.
 */
export const useNow = (tickMs = 1000) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);
  return now;
};

export default useNow;
