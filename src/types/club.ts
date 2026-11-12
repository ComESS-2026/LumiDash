export const MEMBER_ROLES = [
  'President',
  'Vice President',
  'Treasurer',
  'Secretary',
  'Officer',
  'Member',
] as const;

export const MEMBER_STATUSES = ['active', 'inactive', 'alumni'] as const;

export const EVENT_CATEGORIES = [
  'Meeting',
  'Social',
  'Workshop',
  'Competition',
  'Fundraiser',
] as const;

export type MemberRole = (typeof MEMBER_ROLES)[number];
export type MemberStatus = (typeof MEMBER_STATUSES)[number];
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export interface Member {
  id: string;
  full_name: string;
  email: string;
  student_id: string | null;
  department: string | null;
  /** "sheet:<id>" for members copied from the Google Sheet, null for members added in the app. */
  source_id: string | null;
  role: MemberRole;
  status: MemberStatus;
  joined_on: string;
  created_at: string;
}

export type MemberInput = Pick<
  Member,
  'full_name' | 'email' | 'student_id' | 'role' | 'status' | 'joined_on'
>;

export interface ClubEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  category: EventCategory;
  starts_at: string;
  capacity: number | null;
  /** "sheet:<id>" for events copied from the Google Sheet, null for events added in the app. */
  source_id: string | null;
  created_at: string;
}

export type EventInput = Pick<
  ClubEvent,
  'title' | 'description' | 'location' | 'category' | 'starts_at' | 'capacity'
>;
