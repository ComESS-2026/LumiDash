import { SHEET_BASE } from './sheet';
import { parseEventDate } from './alerts';
import { MEMBER_ROLES } from '../types/club';
import type { MemberRole, MemberStatus } from '../types/club';

/** Members imported from a sheet without an email get an address on this domain. */
export const PLACEHOLDER_EMAIL_DOMAIN = 'sheet.local';

export function isPlaceholderEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`);
}

export function placeholderEmail(sourceId: string): string {
  const slug = sourceId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug || 'member'}@${PLACEHOLDER_EMAIL_DOMAIN}`;
}

export interface SheetMemberImport {
  source_id: string;
  full_name: string;
  department: string | null;
  status: MemberStatus;
  // Only set when the sheet has a matching column.
  email?: string;
  student_id?: string | null;
  role?: MemberRole;
  joined_on?: string;
}

export interface SheetMembersResult {
  members: SheetMemberImport[];
  /** source_id of every sheet row that has an id, even if the row is unusable. */
  presentSourceIds: string[];
  skipped: number;
}

type Row = Record<string, unknown>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function pick(row: Row, ...keys: string[]): string | undefined {
  for (const key of keys) {
    if (key in row) return String(row[key] ?? '').trim();
  }
  return undefined;
}

export function normalizeStatus(value: string | undefined): MemberStatus {
  const text = (value ?? '').toLowerCase();
  if (text.includes('alumni') || text.includes('ศิษย์เก่า')) return 'alumni';
  if (text.includes('inactive') || text.includes('ไม่')) return 'inactive';
  return 'active';
}

function normalizeRole(value: string | undefined): MemberRole | undefined {
  const text = (value ?? '').toLowerCase();
  return MEMBER_ROLES.find((role) => role.toLowerCase() === text);
}

function toIsoDay(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = parseEventDate(value);
  if (!date) return undefined;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Turns the raw rows of the sheet's Members tab into members the app can store. */
export function parseSheetMembers(body: unknown): SheetMembersResult {
  if (!Array.isArray(body)) throw new Error('The club sheet returned unexpected data.');

  const members: SheetMemberImport[] = [];
  const presentSourceIds: string[] = [];
  const seen = new Set<string>();
  let skipped = 0;

  for (const raw of body as Row[]) {
    const id = pick(raw, 'id', 'member_id') ?? '';
    const fullName = pick(raw, 'name', 'full_name', 'member_name') ?? '';
    // A repeated id would make the two rows fight over one member on every sync: keep the first.
    if (id && seen.has(id)) {
      skipped += 1;
      continue;
    }
    if (id) {
      seen.add(id);
      presentSourceIds.push(`sheet:${id}`);
    }
    if (!id || !fullName) {
      skipped += 1;
      continue;
    }

    const member: SheetMemberImport = {
      source_id: `sheet:${id}`,
      full_name: fullName,
      department: pick(raw, 'department') || null,
      status: normalizeStatus(pick(raw, 'status')),
    };

    const email = pick(raw, 'email')?.toLowerCase();
    if (email && EMAIL_PATTERN.test(email)) member.email = email;

    const studentId = pick(raw, 'student_id');
    if (studentId !== undefined) member.student_id = studentId || null;

    const role = normalizeRole(pick(raw, 'role'));
    if (role) member.role = role;

    const joined = toIsoDay(pick(raw, 'joined_on', 'joined_date', 'join_date'));
    if (joined) member.joined_on = joined;

    members.push(member);
  }

  return { members, presentSourceIds, skipped };
}

export async function fetchSheetMembers(signal?: AbortSignal): Promise<SheetMembersResult> {
  const response = await fetch(`${SHEET_BASE}/Members`, { signal });
  if (!response.ok) throw new Error('The club sheet could not be reached.');
  return parseSheetMembers(await response.json());
}

export interface ExistingSheetMember {
  id: string;
  source_id: string;
  full_name: string;
  department: string | null;
  status: string;
  email: string;
  student_id: string | null;
  role: string;
  joined_on: string;
}

export interface MemberChanges {
  full_name?: string;
  department?: string | null;
  status?: MemberStatus;
  email?: string;
  student_id?: string | null;
  role?: MemberRole;
  joined_on?: string;
}

export interface SheetMemberSyncPlan {
  toInsert: SheetMemberImport[];
  toUpdate: { id: string; changes: MemberChanges }[];
  toDeleteIds: string[];
}

/**
 * Compares the sheet with the members already copied into the database.
 * The sheet is the source of truth for members that came from it, but only for
 * the columns the sheet actually has.
 */
export function planMemberSync(existing: ExistingSheetMember[], sheet: SheetMembersResult): SheetMemberSyncPlan {
  const bySource = new Map(existing.map((row) => [row.source_id, row]));
  const present = new Set(sheet.presentSourceIds);

  const toInsert: SheetMemberImport[] = [];
  const toUpdate: SheetMemberSyncPlan['toUpdate'] = [];

  for (const member of sheet.members) {
    const row = bySource.get(member.source_id);
    if (!row) {
      toInsert.push(member);
      continue;
    }

    const changes: MemberChanges = {};
    if (row.full_name !== member.full_name) changes.full_name = member.full_name;
    if ((row.department ?? null) !== member.department) changes.department = member.department;
    if (row.status !== member.status) changes.status = member.status;
    if (member.email !== undefined && row.email !== member.email) changes.email = member.email;
    if (member.student_id !== undefined && (row.student_id ?? null) !== member.student_id) {
      changes.student_id = member.student_id;
    }
    if (member.role !== undefined && row.role !== member.role) changes.role = member.role;
    if (member.joined_on !== undefined && row.joined_on !== member.joined_on) {
      changes.joined_on = member.joined_on;
    }
    if (Object.keys(changes).length > 0) toUpdate.push({ id: row.id, changes });
  }

  // An empty sheet is more likely a hiccup than a request to wipe everything.
  const toDeleteIds =
    sheet.presentSourceIds.length === 0
      ? []
      : existing.filter((row) => !present.has(row.source_id)).map((row) => row.id);

  return { toInsert, toUpdate, toDeleteIds };
}
