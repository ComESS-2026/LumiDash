import { supabase } from '@/lib/supabase';
import type { ClubEvent, EventInput, Member, MemberInput } from '@/types/club';

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

export async function updateEvent(id: string, input: EventInput): Promise<void> {
  const { error } = await supabase.from('events').update(input).eq('id', id);
  assertNoError(error);
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  assertNoError(error);
}
