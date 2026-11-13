import { INPUT_CLASS } from '@/components/ui/FormField';
import { formatDate } from '@/lib/format';
import { ATTENDANCE_STATUSES } from '@/lib/sheetAttendance';
import type { AttendanceChoice } from '@/lib/clubApi';
import type { ClubEvent } from '@/types/club';

interface MemberAttendanceFieldsProps {
  events: ClubEvent[] | null;
  loading: boolean;
  error: string | null;
  value: Record<string, AttendanceChoice>;
  disabled: boolean;
  onChange: (eventId: string, status: AttendanceChoice) => void;
  onSetAll: (status: AttendanceChoice) => void;
}

export default function MemberAttendanceFields({
  events,
  loading,
  error,
  value,
  disabled,
  onChange,
  onSetAll,
}: MemberAttendanceFieldsProps) {
  const sorted = [...(events ?? [])].sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  const recorded = Object.values(value).filter(Boolean).length;
  const now = Date.now();

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <legend className="text-sm font-medium text-slate-700">Attendance</legend>
          <p className="text-xs text-slate-500">
            Pick the events this member went to. Leave “Not recorded” for events you don’t want to track.
          </p>
        </div>
        {sorted.length > 0 && (
          <div className="flex shrink-0 gap-3 text-xs font-medium">
            <button
              type="button"
              onClick={() => onSetAll('present')}
              className="text-emerald-700 hover:text-emerald-800"
            >
              All present
            </button>
            <button type="button" onClick={() => onSetAll('')} className="text-slate-500 hover:text-slate-700">
              Clear
            </button>
          </div>
        )}
      </div>

      {loading && <p className="rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-500">Loading events…</p>}

      {!loading && error && (
        <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </p>
      )}

      {!loading && !error && sorted.length === 0 && (
        <p className="rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-500">
          There are no events yet. Add an event or sync from the sheet first, then record attendance here.
        </p>
      )}

      {!loading && !error && sorted.length > 0 && (
        <>
          <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
            {sorted.map((event) => (
              <li key={event.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{event.title}</p>
                  <p className="text-xs text-slate-500">
                    {formatDate(event.starts_at)}
                    {event.starts_at && new Date(event.starts_at).getTime() > now ? ' · upcoming' : ''}
                  </p>
                </div>
                <select
                  aria-label={`Attendance for ${event.title}`}
                  className={`${INPUT_CLASS} w-36 shrink-0 capitalize`}
                  value={value[event.id] ?? ''}
                  onChange={(e) => onChange(event.id, e.target.value as AttendanceChoice)}
                >
                  <option value="">Not recorded</option>
                  {ATTENDANCE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">
            {recorded} of {sorted.length} events recorded.
          </p>
        </>
      )}
    </fieldset>
  );
}
