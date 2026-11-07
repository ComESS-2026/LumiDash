import type { EventCategory, MemberRole, MemberStatus } from '@/types/club';

export type BadgeTone = 'emerald' | 'sky' | 'amber' | 'rose' | 'slate' | 'orange';

export const STATUS_TONES: Record<MemberStatus, BadgeTone> = {
  active: 'emerald',
  inactive: 'amber',
  alumni: 'slate',
};

export const ROLE_TONES: Record<MemberRole, BadgeTone> = {
  President: 'emerald',
  'Vice President': 'emerald',
  Treasurer: 'sky',
  Secretary: 'sky',
  Officer: 'sky',
  Member: 'slate',
};

export const CATEGORY_TONES: Record<EventCategory, BadgeTone> = {
  Meeting: 'slate',
  Social: 'orange',
  Workshop: 'sky',
  Competition: 'rose',
  Fundraiser: 'amber',
};
