import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { formatDate } from '@/lib/format';
import type { AttendanceStatus, MemberAttendance } from '@/lib/sheetAttendance';
import { RATE_BAR_CLASSES, rateTone } from '@/lib/tones';
import type { BadgeTone } from '@/lib/tones';
import type { Member } from '@/types/club';

const STATUS_TONES: Record<AttendanceStatus, BadgeTone> = {
  present: 'emerald',
  late: 'amber',
  excused: 'sky',
  absent: 'rose',
};

interface AttendanceModalProps {
  member: Member | null;
  attendance: MemberAttendance | undefined;
  onClose: () => void;
}

export default function AttendanceModal({ member, attendance, onClose }: AttendanceModalProps) {
  return (
    <Modal
      open={member !== null}
      title={member ? `${member.full_name}'s attendance` : 'Attendance'}
      description="From the club sheet and from attendance recorded in this app."
      onClose={onClose}
    >
      {!attendance || attendance.total === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          No attendance has been recorded for this member yet. Use Edit member to record the events they attended,
          or add them to the Attendance tab of the club sheet.
        </p>
      ) : (
        <div className="space-y-5">
          <div>
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                Attended {attendance.attended} of {attendance.total} events
              </p>
              <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{attendance.rate}%</p>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full ${RATE_BAR_CLASSES[rateTone(attendance.rate)]}`}
                style={{ width: `${attendance.rate}%` }}
              />
            </div>
          </div>

          <ul className="max-h-96 divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
            {attendance.history.map((entry) => (
              <li key={entry.eventKey} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{entry.eventName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{entry.date ? formatDate(entry.date) : 'Date not set'}</p>
                </div>
                <Badge tone={STATUS_TONES[entry.status]}>{entry.status}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}