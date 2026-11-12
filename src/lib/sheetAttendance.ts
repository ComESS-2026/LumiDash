import { SHEET_BASE } from './sheet';
import { parseEventDate } from './alerts';

export type AttendanceStatus = 'present' | 'late' | 'excused' | 'absent';

export const ATTENDANCE_STATUSES: readonly AttendanceStatus[] = ['present', 'late', 'excused', 'absent'];

export interface AttendanceEntry {
  /** Identifies the event: "sheet:<id>" for sheet events, "app:<uuid>" for events made in the app. */
  eventKey: string;
  eventName: string;
  /** YYYY-MM-DD, or an empty string when the event has no readable date. */
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

// ---- data that lives in the app's database --------------------------------

export interface AppMemberRef {
  id: string;
  source_id: string | null;
}

export interface AppEventRef {
  id: string;
  title: string;
  starts_at: string;
  source_id: string | null;
}

export interface AppAttendanceRow {
  member_id: string;
  event_id: string;
  status: string;
}

export interface AppClubData {
  members: AppMemberRef[];
  events: AppEventRef[];
  attendance: AppAttendanceRow[];
}

export const EMPTY_APP_DATA: AppClubData = { members: [], events: [], attendance: [] };

export interface AttendanceSummary {
  /** How many events have attendance recorded (in the sheet or in the app). */
  totalEvents: number;
  /** Keyed by memberKeyOf(member). */
  byMember: Map<string, MemberAttendance>;
  /**
   * Per event: how many more (or fewer) people attended because of what was recorded in the app,
   * compared with the sheet's Attendance tab. Keyed by the event key.
   */
  attendeeDelta: Map<string, number>;
}

type Row = Record<string, unknown>;

const text = (value: unknown): string => String(value ?? '').trim();
const rowsOf = (value: unknown): Row[] => (Array.isArray(value) ? (value as Row[]) : []);

/** "sheet:<id>" for members/events copied from the sheet, "app:<uuid>" for ones made in the app. */
export function memberKeyOf(item: { id: string; source_id?: string | null }): string {
  return item.source_id ?? `app:${item.id}`;
}

export const eventKeyOf = memberKeyOf;

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

function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function toIsoDay(value: unknown): string {
  const date = parseEventDate(value);
  return date ? isoDay(date) : '';
}

/**
 * Builds per-student attendance from the sheet (Attendance, Events and Members tabs)
 * and from attendance recorded in the app.
 *
 * - An event counts as "taken" once it has at least one record.
 * - Members from the sheet: a missing record for a taken event counts as absent.
 * - Members added in the app: only the events you recorded for them count.
 * - If the sheet and the app both have a record for the same student and event, the app wins.
 */
export function buildAttendanceSummary(
  attendanceBody: unknown,
  eventsBody: unknown,
  membersBody: unknown,
  app: AppClubData = EMPTY_APP_DATA,
): AttendanceSummary {
  const events = new Map<string, { name: string; date: string }>();
  for (const row of rowsOf(eventsBody)) {
    const id = text(row.id ?? row.event_id);
    if (!id) continue;
    events.set(`sheet:${id}`, {
      name: text(row.event_name ?? row.name ?? row.title) || `Event ${id}`,
      date: toIsoDay(row.date),
    });
  }
  for (const event of app.events) {
    const key = eventKeyOf(event);
    if (events.has(key)) continue;
    const start = new Date(event.starts_at);
    events.set(key, {
      name: text(event.title) || 'Event',
      date: Number.isNaN(start.getTime()) ? '' : isoDay(start),
    });
  }

  const memberKeys = new Set<string>();
  for (const row of rowsOf(membersBody)) {
    const id = text(row.id ?? row.member_id);
    if (id) memberKeys.add(`sheet:${id}`);
  }
  for (const member of app.members) memberKeys.add(memberKeyOf(member));

  // Records from the sheet: eventKey -> (memberKey -> status)
  const sheetRecords = new Map<string, Map<string, AttendanceStatus>>();
  for (const row of rowsOf(attendanceBody)) {
    const eventId = text(row.event_id);
    const memberId = text(row.member_id);
    if (!eventId || !memberId) continue;
    const eventKey = `sheet:${eventId}`;
    const memberKey = `sheet:${memberId}`;
    memberKeys.add(memberKey);

    const status = normalizeAttendanceStatus(row.status);
    const forEvent = sheetRecords.get(eventKey) ?? new Map<string, AttendanceStatus>();
    const existing = forEvent.get(memberKey);
    if (!existing || (!isAttended(existing) && isAttended(status))) forEvent.set(memberKey, status);
    sheetRecords.set(eventKey, forEvent);
  }

  // Sheet records plus what was recorded in the app (the app wins)
  const records = new Map<string, Map<string, AttendanceStatus>>();
  for (const [eventKey, forEvent] of sheetRecords) records.set(eventKey, new Map(forEvent));

  const memberById = new Map(app.members.map((member) => [member.id, memberKeyOf(member)]));
  const eventById = new Map(app.events.map((event) => [event.id, eventKeyOf(event)]));
  const attendeeDelta = new Map<string, number>();

  for (const row of app.attendance) {
    const memberKey = memberById.get(row.member_id);
    const eventKey = eventById.get(row.event_id);
    if (!memberKey || !eventKey) continue;

    const status = normalizeAttendanceStatus(row.status);
    const before = sheetRecords.get(eventKey)?.get(memberKey);
    const sheetAttended = before !== undefined && isAttended(before);
    if (isAttended(status) && !sheetAttended) {
      attendeeDelta.set(eventKey, (attendeeDelta.get(eventKey) ?? 0) + 1);
    } else if (!isAttended(status) && sheetAttended) {
      attendeeDelta.set(eventKey, (attendeeDelta.get(eventKey) ?? 0) - 1);
    }

    const forEvent = records.get(eventKey) ?? new Map<string, AttendanceStatus>();
    forEvent.set(memberKey, status);
    records.set(eventKey, forEvent);
    memberKeys.add(memberKey);
  }

  // Newest event first; events without a readable date go last.
  const takenEventKeys = [...records.keys()].sort((a, b) => {
    const dateA = events.get(a)?.date ?? '';
    const dateB = events.get(b)?.date ?? '';
    if (dateA !== dateB) return !dateA ? 1 : !dateB ? -1 : dateB.localeCompare(dateA);
    return a.localeCompare(b);
  });

  const byMember = new Map<string, MemberAttendance>();
  for (const memberKey of memberKeys) {
    const trackedOnly = memberKey.startsWith('app:'); // app members: only events recorded for them
    const history: AttendanceEntry[] = [];
    for (const eventKey of takenEventKeys) {
      const recorded = records.get(eventKey)?.get(memberKey);
      if (trackedOnly && recorded === undefined) continue;
      history.push({
        eventKey,
        eventName: events.get(eventKey)?.name ?? 'Event',
        date: events.get(eventKey)?.date ?? '',
        status: recorded ?? 'absent',
      });
    }
    const attended = history.filter((entry) => isAttended(entry.status)).length;
    const total = history.length;
    byMember.set(memberKey, {
      attended,
      total,
      rate: total > 0 ? Math.round((attended / total) * 100) : 0,
      history,
    });
  }

  return { totalEvents: takenEventKeys.length, byMember, attendeeDelta };
}

export async function fetchAttendanceSummary(
  app: AppClubData,
  signal?: AbortSignal,
): Promise<AttendanceSummary> {
  const [attendance, events, members] = await Promise.all(
    ['Attendance', 'Events', 'Members'].map(async (tab) => {
      const response = await fetch(`${SHEET_BASE}/${tab}`, { signal });
      if (!response.ok) throw new Error(`The ${tab} tab of the club sheet could not be read.`);
      return (await response.json()) as unknown;
    }),
  );
  return buildAttendanceSummary(attendance, events, members, app);
}
