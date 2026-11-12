import { useEffect, useState } from 'react';
import { fetchAttendanceSummary } from '@/lib/sheetAttendance';
import type { AttendanceSummary } from '@/lib/sheetAttendance';

const REFRESH_MS = 30_000;

/** Per-student attendance from the club sheet, refreshed every 30 seconds. */
export function useSheetAttendance() {
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        setSummary(await fetchAttendanceSummary(controller.signal));
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
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, []);

  return { summary, error, loading };
}
