import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bell, CalendarClock, CheckCheck } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';

interface NotificationBellProps {
  /** Which edge of the bell the dropdown lines up with. */
  align: 'left' | 'right';
  /** "sidebar" is for the dark sidebar, "header" for the light/dark top bar. */
  tone: 'sidebar' | 'header';
}

export default function NotificationBell({ align, tone }: NotificationBellProps) {
  const { alerts, unreadCount, isUnread, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const buttonTone =
    tone === 'sidebar'
      ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800';

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={open}
        className={`relative rounded-lg p-2 transition ${buttonTone}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl animate-scale-in dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 ${
            align === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <p className="text-sm font-semibold">Notifications</p>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 transition hover:text-emerald-800 disabled:cursor-not-allowed disabled:text-slate-400 dark:text-emerald-400 dark:disabled:text-slate-600"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all as read
            </button>
          </div>

          {alerts.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No alerts right now. Budget and events are on track.
            </p>
          ) : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
              {alerts.map((alert) => {
                const Icon = alert.level === 'danger' ? AlertTriangle : CalendarClock;
                const unread = isUnread(alert.id);
                return (
                  <li key={alert.id} className="flex gap-3 px-4 py-3">
                    <Icon
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        alert.level === 'danger' ? 'text-rose-600 dark:text-rose-400' : 'text-sky-600 dark:text-sky-400'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${unread ? 'font-semibold' : 'font-normal'}`}>{alert.message}</p>
                      {alert.detail && (
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{alert.detail}</p>
                      )}
                    </div>
                    {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" aria-label="Unread" />}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
