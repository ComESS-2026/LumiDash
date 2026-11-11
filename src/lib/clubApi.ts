import { supabase } from '@/lib/supabase';
import type { ClubEvent, EventInput, Member, MemberInput } from '@/types/club';
import type { SheetEventImport } from '@/lib/sheetEvents';

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

export async function importSheetEvents(userId: string, events: SheetEventImport[]): Promise<number> {
  if (events.length === 0) return 0;
  const rows = events.map((event) => ({
    ...event,
    user_id: userId,
    category: 'Meeting',
  }));
  const { data, error } = await supabase
    .from('events')
    .upsert(rows, { onConflict: 'user_id,source_id', ignoreDuplicates: true })
    .select('id');
  assertNoError(error);
  return (data ?? []).length;
}

export async function updateEvent(id: string, input: EventInput): Promise<void> {
  const { error } = await supabase.from('events').update(input).eq('id', id);
  assertNoError(error);
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  assertNoError(error);
}
