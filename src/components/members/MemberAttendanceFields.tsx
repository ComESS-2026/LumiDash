import { FileSpreadsheet } from 'lucide-react';
import { INPUT_CLASS } from '@/components/ui/FormField';
import { formatDate } from '@/lib/format';
import { ATTENDANCE_STATUSES } from '@/lib/sheetAttendance';
import type { AttendanceChoice } from '@/lib/sheetAttendance';
import type { ClubEvent } from '@/types/club';

interface MemberAttendanceFieldsProps {
  events: ClubEvent[] | null;
  loading: boolean;
  error: string | null;
  value: Record<string, AttendanceChoice>;
  /** Events that already have a record for this member in the club sheet. */
  sheetBacked: Set<string>;
  disabled: boolean;
  onChange: (eventId: string, status: AttendanceChoice) => void;
  onMarkUnrecordedPresent: () => void;
  onClearAppRecords: () => void;
}

function startTime(event: ClubEvent): number {
  const time = new Date(event.starts_at).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export default function MemberAttendanceFields({
  events,
  loading,
  error,
  value,
  sheetBacked,
  disabled,
  onChange,
  onMarkUnrecordedPresent,
  onClearAppRecords,
}: MemberAttendanceFieldsProps) {
  const sorted = [...(events ?? [])].sort((a, b) => startTime(b) - startTime(a));
  const recorded = Object.values(value).filter(Boolean).length;
  const now = Date.now();

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">Attendance</legend>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pick the events this member went to. The percentage only counts events you record here (and any the sheet
            already has for them).
          </p>
        </div>
        {sorted.length > 0 && (
          <div className="flex shrink-0 gap-3 text-xs font-medium">
            <button
              type="button"
              onClick={onMarkUnrecordedPresent}
              title="Marks every past event that has no record yet as present"
              className="text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              Mark unrecorded present
            </button>
            <button
              type="button"
              onClick={onClearAppRecords}
              title="Clears the records you added here. Records from the sheet stay."
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {loading && (
        <p className="rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
          Loading events…
        </p>
      )}

      {!loading && error && (
        <p
          role="alert"
          className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/15 dark:text-amber-300"
        >
          {error}
        </p>
      )}

      {!loading && !error && sorted.length === 0 && (
        <p className="rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
          There are no events yet. Add an event or sync from the sheet first, then record attendance here.
        </p>
      )}

      {!loading && !error && sorted.length > 0 && (
        <>
          <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {sorted.map((event) => {
              const fromSheet = sheetBacked.has(event.id);
              const upcoming = startTime(event) > now;
              return (
                <li key={event.id} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <div className="min-w-0 sm:flex-1">
                    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm font-medium text-slate-900 dark:text-white">
                      <span className="break-words" title={event.title}>
                        {event.title || 'Untitled event'}
                      </span>
                      {fromSheet && (
                        <span
                          title="This member already has a record for this event in the club sheet"
                          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-400/30"
                        >
                          <FileSpreadsheet className="h-3 w-3" />
                          Sheet
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(event.starts_at) || 'Date not set'}
                      {upcoming ? ' · upcoming' : ''}
                    </p>
                  </div>
                  <select
                    aria-label={`Attendance for ${event.title}`}
                    className={`${INPUT_CLASS} capitalize sm:w-40 sm:shrink-0`}
                    value={value[event.id] ?? ''}
                    onChange={(e) => onChange(event.id, e.target.value as AttendanceChoice)}
                  >
                    {!fromSheet && <option value="">Not recorded</option>}
                    {ATTENDANCE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {recorded} of {sorted.length} events recorded.
          </p>
        </>
      )}
    </fieldset>
  );
}
