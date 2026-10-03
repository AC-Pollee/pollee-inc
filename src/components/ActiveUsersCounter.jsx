import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { base44 } from '@/api/base44Client';

// Shows a live count of members currently active on Pollee. Pings the
// track-presence backend function on mount and every 45s, which both
// records this user's heartbeat and returns the active-session count.
export default function ActiveUsersCounter() {
  const { t } = useTranslation();
  const [count, setCount] = useState(null);

  useEffect(() => {
    let alive = true;
    const ping = async () => {
      try {
        const res = await base44.functions.invoke('track-presence');
        if (alive && res?.data && typeof res.data.active_users === 'number') {
          setCount(res.data.active_users);
        }
      } catch (e) {
        // keep the last known count on error
      }
    };
    ping();
    const id = setInterval(ping, 45000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (count === null) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs text-slate-400">
        <span className="w-2 h-2 rounded-full bg-slate-300" />
        …
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 dark:bg-slate-800/70 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-700 dark:text-emerald-400">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      {t('home.onlineUsers', { count })}
    </div>
  );
}