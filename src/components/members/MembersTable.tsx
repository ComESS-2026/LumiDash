import { CalendarCheck, Pencil, Trash2 } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { getInitials, formatDate } from '@/lib/format';
import { sheetMemberKey } from '@/lib/sheetAttendance';
import type { AttendanceSummary } from '@/lib/sheetAttendance';
import { isPlaceholderEmail } from '@/lib/sheetMembers';
import { RATE_BAR_CLASSES, ROLE_TONES, STATUS_TONES, rateTone } from '@/lib/tones';
import type { Member } from '@/types/club';

interface MembersTableProps {
  members: Member[];
  attendance: AttendanceSummary | null;
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
  onViewAttendance: (member: Member) => void;
}

export default function MembersTable({ members, attendance, onEdit, onDelete, onViewAttendance }: MembersTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <tr>
            <th scope="col" className="px-6 py-3">Member</th>
            <th scope="col" className="hidden px-6 py-3 md:table-cell">Student ID</th>
            <th scope="col" className="px-6 py-3">Role</th>
            <th scope="col" className="px-6 py-3">Status</th>
            <th scope="col" className="hidden px-6 py-3 md:table-cell">Attendance</th>
            <th scope="col" className="hidden px-6 py-3 lg:table-cell">Joined</th>
            <th scope="col" className="px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {members.map((member) => {
            const key = sheetMemberKey(member);
            const record = key && attendance ? attendance.byMember.get(key) : undefined;
            const hasAttendance = record !== undefined && record.total > 0;
            return (
              <tr key={member.id} className="transition duration-150 hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                      {getInitials(member.full_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{member.full_name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {[member.department, isPlaceholderEmail(member.email) ? null : member.email]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="hidden px-6 py-4 text-slate-600 md:table-cell">
                  {member.student_id ?? <span className="text-slate-400">Not provided</span>}
                </td>
                <td className="px-6 py-4">
                  <Badge tone={ROLE_TONES[member.role]}>{member.role}</Badge>
                </td>
                <td className="px-6 py-4">
                  <Badge tone={STATUS_TONES[member.status]}>{member.status}</Badge>
                </td>
                <td className="hidden px-6 py-4 md:table-cell">
                  {hasAttendance ? (
                    <button
                      type="button"
                      onClick={() => onViewAttendance(member)}
                      className="group w-32 text-left"
                      aria-label={`View ${member.full_name}'s attendance history`}
                    >
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="tabular-nums text-slate-700">
                          {record.attended}/{record.total}
                        </span>
                        <span className="font-semibold tabular-nums text-slate-900">{record.rate}%</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${RATE_BAR_CLASSES[rateTone(record.rate)]}`}
                          style={{ width: `${record.rate}%` }}
                        />
                      </div>
                    </button>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="hidden px-6 py-4 text-slate-600 lg:table-cell">{formatDate(member.joined_on)}</td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onViewAttendance(member)}
                      aria-label={`View ${member.full_name}'s attendance`}
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                    >
                      <CalendarCheck className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(member)}
                      aria-label={`Edit ${member.full_name}`}
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(member)}
                      aria-label={`Delete ${member.full_name}`}
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
