import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { SHEET_BASE } from '@/lib/sheet';
import { computeAlerts } from '@/lib/alerts';
import type { AppAlert, AppEventRow, BudgetRowRaw, EventRowRaw } from '@/lib/alerts';
import { syncSheetEvents, syncSheetMembers } from '@/lib/clubApi';
import { parseSheetEvents } from '@/lib/sheetEvents';
import { parseSheetMembers } from '@/lib/sheetMembers';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// OpenSheet caches the sheet for about 30 seconds, so checking more often is pointless.
const REFRESH_MS = 30_000;

interface NotificationContextValue {
  alerts: AppAlert[];
  toasts: AppAlert[];
  unreadCount: number;
  /** Goes up every time the sheet changed the events stored in the database. */
  eventsVersion: number;
  /** Goes up every time the sheet changed the members stored in the database. */
  membersVersion: number;
  isUnread: (id: string) => boolean;
  markAllRead: () => void;
  dismissToast: (id: string) => void;
  /** Re-read the sheet and the database right now. */
  refresh: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

// Events created on the app's Events page. If this fails (no table yet, offline),
// we still show the alerts that come from the Google Sheet.
async function loadAppEvents(): Promise<AppEventRow[]> {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from('events')
      .select('id, title, starts_at')
      .gte('starts_at', startOfToday.toISOString())
      .order('starts_at', { ascending: true })
      .limit(100);
    if (error || !data) return [];
    return data as AppEventRow[];
  } catch {
    return [];
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [alerts, setAlerts] = useState<AppAlert[]>([]);
  const [toasts, setToasts] = useState<AppAlert[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [eventsVersion, setEventsVersion] = useState(0);
  const [membersVersion, setMembersVersion] = useState(0);

  const knownIds = useRef<Set<string>>(new Set());
  const checkRef = useRef<(() => Promise<void>) | null>(null);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds(new Set(alerts.map((alert) => alert.id)));
  }, [alerts]);

  const refresh = useCallback(() => {
    void checkRef.current?.();
  }, []);

  useEffect(() => {
    if (!userId) {
      setAlerts([]);
      setToasts([]);
      setReadIds(new Set());
      knownIds.current = new Set();
      checkRef.current = null;
      return;
    }

    const ownerId: string = userId;
    const controller = new AbortController();

    async function check() {
      try {
        const [budgetRes, eventsRes] = await Promise.all([
          fetch(`${SHEET_BASE}/Budget`, { signal: controller.signal }),
          fetch(`${SHEET_BASE}/Events`, { signal: controller.signal }),
        ]);
        if (!budgetRes.ok || !eventsRes.ok) return;

        const budget: unknown = await budgetRes.json();
        const sheetEvents: unknown = await eventsRes.json();
        if (!Array.isArray(budget) || !Array.isArray(sheetEvents)) return;

        // Keep the Events page in step with the sheet: add, update and remove events.
        try {
          const result = await syncSheetEvents(ownerId, parseSheetEvents(sheetEvents));
          if (result.added + result.updated + result.removed > 0) {
            setEventsVersion((version) => version + 1);
          }
        } catch {
          // The alerts below still use the sheet data if the database is unreachable.
        }

        // Same for the member roster.
        try {
          const membersRes = await fetch(`${SHEET_BASE}/Members`, { signal: controller.signal });
          if (membersRes.ok) {
            const result = await syncSheetMembers(ownerId, parseSheetMembers(await membersRes.json()));
            if (result.added + result.updated + result.removed > 0) {
              setMembersVersion((version) => version + 1);
            }
          }
        } catch {
          // Members are optional for the alerts, so ignore a failed sync here.
        }

        const appEvents = await loadAppEvents();
        const next = computeAlerts(budget as BudgetRowRaw[], sheetEvents as EventRowRaw[], appEvents);
        const nextIds = new Set(next.map((alert) => alert.id));

        // Toast only alerts that just appeared; forget ones whose condition cleared.
        const fresh = next.filter((alert) => !knownIds.current.has(alert.id));
        knownIds.current = nextIds;

        setAlerts(next);
        setReadIds((prev) => new Set([...prev].filter((id) => nextIds.has(id))));
        if (fresh.length > 0) setToasts((current) => [...current, ...fresh]);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // Keep showing the last known alerts if the sheet is unreachable.
      }
    }

    checkRef.current = check;
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
      eventsVersion,
      membersVersion,
      isUnread: (id) => !readIds.has(id),
      markAllRead,
      dismissToast,
      refresh,
    }),
    [alerts, toasts, readIds, eventsVersion, membersVersion, markAllRead, dismissToast, refresh],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used inside NotificationProvider');
  return context;
}
