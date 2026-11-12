import { supabase } from '@/lib/supabase';
import type { ClubEvent, EventInput, Member, MemberInput } from '@/types/club';
import { planSheetSync } from '@/lib/sheetEvents';
import type { ExistingSheetEvent, SheetEventsResult } from '@/lib/sheetEvents';
import { placeholderEmail, planMemberSync } from '@/lib/sheetMembers';
import type { ExistingSheetMember, SheetMembersResult } from '@/lib/sheetMembers';
import type {
  AppAttendanceRow,
  AppClubData,
  AppEventRef,
  AppMemberRef,
  AttendanceStatus,
} from '@/lib/sheetAttendance';

function assertNoError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function listMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('full_name', { ascending: true });
  assertNoError(error);
  return (data ?? []) as Member[];
}

export async function createMember(input: MemberInput): Promise<Member> {
  const { data, error } = await supabase.from('members').insert(input).select().single();
  assertNoError(error);
  return data as Member;
}

export async function updateMember(id: string, input: MemberInput): Promise<void> {
  const { error } = await supabase.from('members').update(input).eq('id', id);
  assertNoError(error);
}

export async function deleteMember(id: string): Promise<void> {
  const { error } = await supabase.from('members').delete().eq('id', id);
  assertNoError(error);
}

/**
 * Makes the members copied from the Google Sheet match the sheet:
 * new rows are added, changed rows are updated, deleted rows are removed.
 * Members created in the app (no source_id) are never touched.
 */
export async function syncSheetMembers(userId: string, sheet: SheetMembersResult): Promise<SheetSyncResult> {
  const { data, error } = await supabase
    .from('members')
    .select('id, source_id, full_name, department, status, email, student_id, role, joined_on')
    .like('source_id', 'sheet:%');
  assertNoError(error);

  const plan = planMemberSync((data ?? []) as ExistingSheetMember[], sheet);
  const today = new Date().toISOString().slice(0, 10);

  if (plan.toInsert.length > 0) {
    const rows = plan.toInsert.map((member) => ({
      user_id: userId,
      source_id: member.source_id,
      full_name: member.full_name,
      department: member.department,
      status: member.status,
      email: member.email ?? placeholderEmail(member.source_id),
      student_id: member.student_id ?? null,
      role: member.role ?? 'Member',
      joined_on: member.joined_on ?? today,
    }));
    const { error: insertError } = await supabase
      .from('members')
      .upsert(rows, { onConflict: 'user_id,source_id', ignoreDuplicates: true });
    assertNoError(insertError);
  }

  for (const change of plan.toUpdate) {
    const { error: updateError } = await supabase.from('members').update(change.changes).eq('id', change.id);
    assertNoError(updateError);
  }

  if (plan.toDeleteIds.length > 0) {
    const { error: deleteError } = await supabase.from('members').delete().in('id', plan.toDeleteIds);
    assertNoError(deleteError);
  }

  return { added: plan.toInsert.length, updated: plan.toUpdate.length, removed: plan.toDeleteIds.length };
}

export async function listEvents(): Promise<ClubEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('starts_at', { ascending: true });
  assertNoError(error);
  return (data ?? []) as ClubEvent[];
}

export async function createEvent(input: EventInput): Promise<void> {
  const { error } = await supabase.from('events').insert(input);
  assertNoError(error);
}

export interface SheetSyncResult {
  added: number;
  updated: number;
  removed: number;
}

/**
 * Makes the events copied from the Google Sheet match the sheet:
 * new rows are added, changed rows are updated, deleted rows are removed.
 * Events created in the app (no source_id) are never touched.
 */
export async function syncSheetEvents(userId: string, sheet: SheetEventsResult): Promise<SheetSyncResult> {
  const { data, error } = await supabase
    .from('events')
    .select('id, source_id, title, starts_at')
    .like('source_id', 'sheet:%');
  assertNoError(error);

  const plan = planSheetSync((data ?? []) as ExistingSheetEvent[], sheet);

  if (plan.toInsert.length > 0) {
    const rows = plan.toInsert.map((event) => ({ ...event, user_id: userId, category: 'Meeting' }));
    const { error: insertError } = await supabase
      .from('events')
      .upsert(rows, { onConflict: 'user_id,source_id', ignoreDuplicates: true });
    assertNoError(insertError);
  }

  for (const change of plan.toUpdate) {
    const { error: updateError } = await supabase
      .from('events')
      .update({ title: change.title, starts_at: change.starts_at })
      .eq('id', change.id);
    assertNoError(updateError);
  }

  if (plan.toDeleteIds.length > 0) {
    const { error: deleteError } = await supabase.from('events').delete().in('id', plan.toDeleteIds);
    assertNoError(deleteError);
  }

  return { added: plan.toInsert.length, updated: plan.toUpdate.length, removed: plan.toDeleteIds.length };
}

export async function updateEvent(id: string, input: EventInput): Promise<void> {
  const { error } = await supabase.from('events').update(input).eq('id', id);
  assertNoError(error);
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  assertNoError(error);
}

// ---- attendance recorded in the app ---------------------------------------

/** "" means "not recorded". */
export type AttendanceChoice = AttendanceStatus | '';

const PAGE_SIZE = 1000;

// The API returns at most 1000 rows per request, so read big tables page by page.
async function selectAll<T>(table: string, columns: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    assertNoError(error);
    const page = (data ?? []) as unknown as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

/** Everything the attendance numbers need from the database. */
export async function loadAppClubData(): Promise<AppClubData> {
  const [members, events, attendance] = await Promise.all([
    selectAll<AppMemberRef>('members', 'id, source_id'),
    selectAll<AppEventRef>('events', 'id, title, starts_at, source_id'),
    selectAll<AppAttendanceRow>('attendance', 'id, member_id, event_id, status'),
  ]);
  return { members, events, attendance };
}

/** The attendance already recorded in the app for one member, keyed by event id. */
export async function listMemberAttendance(memberId: string): Promise<Record<string, AttendanceChoice>> {
  const { data, error } = await supabase
    .from('attendance')
    .select('event_id, status')
    .eq('member_id', memberId);
  assertNoError(error);
  const result: Record<string, AttendanceChoice> = {};
  for (const row of (data ?? []) as { event_id: string; status: AttendanceStatus }[]) {
    result[row.event_id] = row.status;
  }
  return result;
}

/** Saves only what changed between `initial` and `desired` (keyed by event id). */
export async function saveMemberAttendance(
  memberId: string,
  desired: Record<string, AttendanceChoice>,
  initial: Record<string, AttendanceChoice>,
): Promise<void> {
  const toUpsert: { member_id: string; event_id: string; status: AttendanceStatus }[] = [];
  const toClear: string[] = [];

  for (const [eventId, status] of Object.entries(desired)) {
    if (status === (initial[eventId] ?? '')) continue;
    if (status === '') toClear.push(eventId);
    else toUpsert.push({ member_id: memberId, event_id: eventId, status });
  }

  if (toUpsert.length > 0) {
    const { error } = await supabase.from('attendance').upsert(toUpsert, { onConflict: 'member_id,event_id' });
    assertNoError(error);
  }
  if (toClear.length > 0) {
    const { error } = await supabase.from('attendance').delete().eq('member_id', memberId).in('event_id', toClear);
    assertNoError(error);
  }
}
