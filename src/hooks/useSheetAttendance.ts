import { useCallback, useEffect, useState } from 'react';
import { loadAppClubData } from '@/lib/clubApi';
import { EMPTY_APP_DATA, fetchAttendanceSummary } from '@/lib/sheetAttendance';
import type { AttendanceSummary } from '@/lib/sheetAttendance';

const REFRESH_MS = 30_000;

/**
 * Per-student attendance from the club sheet plus attendance recorded in the app,
 * refreshed every 30 seconds. Call reload() to refresh right away.
 */
export function useSheetAttendance() {
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    const timer = window.setInterval(reload, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [reload]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        // If the attendance table is not set up yet, still show the sheet's attendance.
        const app = await loadAppClubData().catch(() => EMPTY_APP_DATA);
        setSummary(await fetchAttendanceSummary(app, controller.signal));
        setError(null);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Attendance could not be loaded.');
        // keep the last good data on screen
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [reloadKey]);

  return { summary, error, loading, reload };
}
