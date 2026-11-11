import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { SHEET_BASE } from '@/lib/sheet';
import { computeAlerts } from '@/lib/alerts';
import type { AppAlert, BudgetRowRaw, EventRowRaw } from '@/lib/alerts';
import { useAuth } from '@/contexts/AuthContext';

const REFRESH_MS = 60_000;

interface NotificationContextValue {
  alerts: AppAlert[];
  toasts: AppAlert[];
  unreadCount: number;
  isUnread: (id: string) => boolean;
  markAllRead: () => void;
  dismissToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [alerts, setAlerts] = useState<AppAlert[]>([]);
  const [toasts, setToasts] = useState<AppAlert[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds(new Set(alerts.map((alert) => alert.id)));
  }, [alerts]);

  useEffect(() => {
    if (!userId) {
      setAlerts([]);
      setToasts([]);
      setReadIds(new Set());
      return;
    }

    const controller = new AbortController();
    const knownIds = new Set<string>();

    async function check() {
      try {
        const [budgetRes, eventsRes] = await Promise.all([
          fetch(`${SHEET_BASE}/Budget`, { signal: controller.signal }),
          fetch(`${SHEET_BASE}/Events`, { signal: controller.signal }),
        ]);
        if (!budgetRes.ok || !eventsRes.ok) return;

        const budget: unknown = await budgetRes.json();
        const events: unknown = await eventsRes.json();
        if (!Array.isArray(budget) || !Array.isArray(events)) return;

        const next = computeAlerts(budget as BudgetRowRaw[], events as EventRowRaw[]);
        const nextIds = new Set(next.map((alert) => alert.id));

        // Toast only alerts that just appeared; forget ones whose condition cleared.
        const fresh = next.filter((alert) => !knownIds.has(alert.id));
        knownIds.clear();
        nextIds.forEach((id) => knownIds.add(id));

        setAlerts(next);
        setReadIds((prev) => new Set([...prev].filter((id) => nextIds.has(id))));
        if (fresh.length > 0) setToasts((current) => [...current, ...fresh]);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // Keep showing the last known alerts if the sheet is unreachable.
      }
    }

    void check();
    const timer = window.setInterval(() => void check(), REFRESH_MS);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [userId]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      alerts,
      toasts,
      unreadCount: alerts.filter((alert) => !readIds.has(alert.id)).length,
      isUnread: (id) => !readIds.has(id),
      markAllRead,
      dismissToast,
    }),
    [alerts, toasts, readIds, markAllRead, dismissToast],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used inside NotificationProvider');
  return context;
}
