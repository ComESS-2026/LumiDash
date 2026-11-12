import { supabase } from '@/lib/supabase';
import type { ClubEvent, EventInput, Member, MemberInput } from '@/types/club';
import { planSheetSync } from '@/lib/sheetEvents';
import type { ExistingSheetEvent, SheetEventsResult } from '@/lib/sheetEvents';

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

export async function createMember(input: MemberInput): Promise<void> {
  const { error } = await supabase.from('members').insert(input);
  assertNoError(error);
}

export async function updateMember(id: string, input: MemberInput): Promise<void> {
  const { error } = await supabase.from('members').update(input).eq('id', id);
  assertNoError(error);
}

export async function deleteMember(id: string): Promise<void> {
  const { error } = await supabase.from('members').delete().eq('id', id);
  assertNoError(error);
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
