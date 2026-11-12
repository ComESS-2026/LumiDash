import { SHEET_BASE } from './sheet';
import { parseEventDate } from './alerts';

export type AttendanceStatus = 'present' | 'late' | 'excused' | 'absent';

export interface AttendanceEntry {
  eventId: string;
  eventName: string;
  /** YYYY-MM-DD, or an empty string when the sheet has no readable date. */
  date: string;
  status: AttendanceStatus;
}

export interface MemberAttendance {
  attended: number;
  total: number;
  /** 0 to 100 */
  rate: number;
  history: AttendanceEntry[];
}

export interface AttendanceSummary {
  /** How many events have attendance recorded in the sheet. */
  totalEvents: number;
  /** Keyed by the member's id in the sheet (the Members tab "id" column). */
  byMember: Map<string, MemberAttendance>;
}

type Row = Record<string, unknown>;

const text = (value: unknown): string => String(value ?? '').trim();
const rowsOf = (value: unknown): Row[] => (Array.isArray(value) ? (value as Row[]) : []);

export function normalizeAttendanceStatus(value: unknown): AttendanceStatus {
  const status = text(value).toLowerCase();
  if (status.includes('absent') || status.includes('ขาด') || ['no', 'n', 'false', '0'].includes(status)) {
    return 'absent';
  }
  if (status.includes('excus') || status.startsWith('ลา')) return 'excused';
  if (status.includes('late') || status.includes('สาย')) return 'late';
  return 'present'; // present, attended, yes, or an empty status on an existing row
}

export function isAttended(status: AttendanceStatus): boolean {
  return status === 'present' || status === 'late';
}

function toIsoDay(value: unknown): string {
  const date = parseEventDate(value);
  if (!date) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** The sheet id of a member that was copied from the sheet, or null for members added in the app. */
export function sheetMemberKey(member: { source_id?: string | null }): string | null {
  const source = member.source_id ?? '';
  return source.startsWith('sheet:') ? source.slice('sheet:'.length) : null;
}

/**
 * Builds per-student attendance from the sheet's Attendance, Events and Members tabs.
 * Attendance counts as "taken" for every event that has at least one row in the Attendance tab.
 * A student with no row for such an event is counted as absent.
 */
export function buildAttendanceSummary(
  attendanceBody: unknown,
  eventsBody: unknown,
  membersBody: unknown,
): AttendanceSummary {
  const events = new Map<string, { name: string; date: string }>();
  for (const row of rowsOf(eventsBody)) {
    const id = text(row.id ?? row.event_id);
    if (!id) continue;
    events.set(id, { name: text(row.event_name ?? row.name ?? row.title) || `Event ${id}`, date: toIsoDay(row.date) });
  }

  // eventId -> (memberId -> status)
  const records = new Map<string, Map<string, AttendanceStatus>>();
  const memberIds = new Set<string>();

  for (const row of rowsOf(membersBody)) {
    const id = text(row.id ?? row.member_id);
    if (id) memberIds.add(id);
  }

  for (const row of rowsOf(attendanceBody)) {
    const eventId = text(row.event_id);
    const memberId = text(row.member_id);
    if (!eventId || !memberId) continue;
    memberIds.add(memberId);

    const status = normalizeAttendanceStatus(row.status);
    const forEvent = records.get(eventId) ?? new Map<string, AttendanceStatus>();
    const existing = forEvent.get(memberId);
    if (!existing || (!isAttended(existing) && isAttended(status))) forEvent.set(memberId, status);
    records.set(eventId, forEvent);
  }

  // Newest event first; events without a readable date go last.
  const takenEventIds = [...records.keys()].sort((a, b) => {
    const dateA = events.get(a)?.date ?? '';
    const dateB = events.get(b)?.date ?? '';
    if (dateA !== dateB) return !dateA ? 1 : !dateB ? -1 : dateB.localeCompare(dateA);
    return a.localeCompare(b);
  });

  const byMember = new Map<string, MemberAttendance>();
  for (const memberId of memberIds) {
    const history: AttendanceEntry[] = takenEventIds.map((eventId) => ({
      eventId,
      eventName: events.get(eventId)?.name ?? `Event ${eventId}`,
      date: events.get(eventId)?.date ?? '',
      status: records.get(eventId)?.get(memberId) ?? 'absent',
    }));
    const attended = history.filter((entry) => isAttended(entry.status)).length;
    const total = history.length;
    byMember.set(memberId, { attended, total, rate: total > 0 ? Math.round((attended / total) * 100) : 0, history });
  }

  return { totalEvents: takenEventIds.length, byMember };
}

export async function fetchAttendanceSummary(signal?: AbortSignal): Promise<AttendanceSummary> {
  const [attendance, events, members] = await Promise.all(
    ['Attendance', 'Events', 'Members'].map(async (tab) => {
      const response = await fetch(`${SHEET_BASE}/${tab}`, { signal });
      if (!response.ok) throw new Error(`The ${tab} tab of the club sheet could not be read.`);
      return (await response.json()) as unknown;
    }),
  );
  return buildAttendanceSummary(attendance, events, members);
}
