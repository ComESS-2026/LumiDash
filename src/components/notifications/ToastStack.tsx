import { useEffect } from 'react';
import { AlertTriangle, CalendarClock, X } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import type { AppAlert } from '@/lib/alerts';

const TOAST_MS = 7000;

interface ToastItemProps {
  alert: AppAlert;
  onDismiss: (id: string) => void;
}

function ToastItem({ alert, onDismiss }: ToastItemProps) {
  const { id } = alert;

  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(id), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [id, onDismiss]);

  const danger = alert.level === 'danger';
  const Icon = danger ? AlertTriangle : CalendarClock;

  return (
    <div
      role={danger ? 'alert' : 'status'}
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-lg animate-scale-in ${
        danger
          ? 'border-rose-700 bg-rose-600 text-white'
          : 'border-sky-200 bg-white text-slate-900 dark:border-sky-800 dark:bg-slate-900 dark:text-slate-100'
      }`}
    >
      <Icon
        className={`mt-0.5 h-5 w-5 shrink-0 ${danger ? 'text-white' : 'text-sky-600 dark:text-sky-400'}`}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{alert.message}</p>
        {alert.detail && (
          <p className={`mt-0.5 text-xs ${danger ? 'text-rose-100' : 'text-slate-500 dark:text-slate-400'}`}>
            {alert.detail}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
        className={`rounded p-1 transition ${
          danger ? 'text-rose-100 hover:bg-rose-700' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function ToastStack() {
  const { toasts, dismissToast } = useNotifications();
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} alert={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
}
