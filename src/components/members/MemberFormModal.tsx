import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Button from '@/components/ui/Button';
import FormField, { INPUT_CLASS } from '@/components/ui/FormField';
import MemberAttendanceFields from '@/components/members/MemberAttendanceFields';
import Modal from '@/components/ui/Modal';
import {
  createMember,
  listEvents,
  listMemberAttendance,
  saveMemberAttendance,
  updateMember,
} from '@/lib/clubApi';
import type { AttendanceChoice } from '@/lib/clubApi';
import { MEMBER_ROLES, MEMBER_STATUSES } from '@/types/club';
import type { ClubEvent, Member, MemberInput } from '@/types/club';

interface MemberFormModalProps {
  open: boolean;
  member: Member | null;
  onClose: () => void;
  onSaved: () => void;
  /** Called when something was saved but the form stays open (so the list can refresh). */
  onChanged?: () => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormState {
  full_name: string;
  email: string;
  student_id: string;
  role: Member['role'];
  status: Member['status'];
  joined_on: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

function getInitialState(member: Member | null): FormState {
  return {
    full_name: member?.full_name ?? '',
    email: member?.email ?? '',
    student_id: member?.student_id ?? '',
    role: member?.role ?? 'Member',
    status: member?.status ?? 'active',
    joined_on: member?.joined_on ?? new Date().toISOString().slice(0, 10),
  };
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.full_name.trim()) errors.full_name = 'Enter the member’s full name.';
  if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = 'Enter a valid email address.';
  if (!form.joined_on) errors.joined_on = 'Choose a join date.';
  return errors;
}

export default function MemberFormModal({ open, member, onClose, onSaved, onChanged }: MemberFormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={member ? 'Edit member' : 'Add member'}
      description={
        member ? 'Update details and role for this member.' : 'Add a new student to your club roster.'
      }
    >
      <MemberForm
        key={member?.id ?? 'new'}
        member={member}
        onClose={onClose}
        onSaved={onSaved}
        onChanged={onChanged}
      />
    </Modal>
  );
}

interface MemberFormProps {
  member: Member | null;
  onClose: () => void;
  onSaved: () => void;
  onChanged?: () => void;
}

function describeAttendanceError(err: unknown): string {
  const message = err instanceof Error ? err.message : '';
  if (/attendance/i.test(message) && /(schema cache|does not exist|relation)/i.test(message)) {
    return 'The attendance table is missing in Supabase. Run the attendance SQL, then try again.';
  }
  return 'Please try again.';
}

function MemberForm({ member, onClose, onSaved, onChanged }: MemberFormProps) {
  const [form, setForm] = useState<FormState>(() => getInitialState(member));
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Attendance for this member, per event id. "" = not recorded.
  const memberId = member?.id ?? null;
  const [events, setEvents] = useState<ClubEvent[] | null>(null);
  const [attendance, setAttendance] = useState<Record<string, AttendanceChoice>>({});
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const initialAttendance = useRef<Record<string, AttendanceChoice>>({});
  const savedMemberId = useRef<string | null>(memberId); // set after a new member is created

  useEffect(() => {
    let cancelled = false;
    async function loadAttendance() {
      try {
        const [eventList, existing] = await Promise.all([
          listEvents(),
          memberId ? listMemberAttendance(memberId) : Promise.resolve({} as Record<string, AttendanceChoice>),
        ]);
        if (cancelled) return;
        initialAttendance.current = existing;
        setEvents(eventList);
        setAttendance(existing);
      } catch (err) {
        if (!cancelled) {
          setAttendanceError(`Attendance could not be loaded. ${describeAttendanceError(err)}`);
        }
      } finally {
        if (!cancelled) setAttendanceLoading(false);
      }
    }
    void loadAttendance();
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  const setEventAttendance = (eventId: string, status: AttendanceChoice) => {
    setAttendance((prev) => ({ ...prev, [eventId]: status }));
  };

  const setAllAttendance = (status: AttendanceChoice) => {
    setAttendance(Object.fromEntries((events ?? []).map((event) => [event.id, status])));
  };

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload: MemberInput = {
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      student_id: form.student_id.trim() || null,
      role: form.role,
      status: form.status,
      joined_on: form.joined_on,
    };

    setSaving(true);
    setSubmitError(null);
    try {
      let id = savedMemberId.current;
      if (id) {
        await updateMember(id, payload);
      } else {
        const created = await createMember(payload);
        id = created.id;
        savedMemberId.current = id; // a retry must update this member, not create a duplicate
      }
      onChanged?.();

      if (events && !attendanceError) {
        try {
          await saveMemberAttendance(id, attendance, initialAttendance.current);
          initialAttendance.current = { ...attendance };
        } catch (err) {
          setSubmitError(`The member was saved, but attendance was not. ${describeAttendanceError(err)}`);
          return;
        }
      }
      onSaved();
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setSubmitError(
        message.includes('duplicate')
          ? 'Another member already uses this email address.'
          : 'We could not save this member. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <FormField label="Full name" htmlFor="member-name" error={errors.full_name}>
        <input
          id="member-name"
          className={INPUT_CLASS}
          value={form.full_name}
          onChange={(e) => updateField('full_name', e.target.value)}
          placeholder="e.g. Maya Chen"
          autoFocus
        />
      </FormField>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField label="Email" htmlFor="member-email" error={errors.email}>
          <input
            id="member-email"
            type="email"
            className={INPUT_CLASS}
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="name@university.edu"
          />
        </FormField>
        <FormField label="Student ID" htmlFor="member-student-id" hint="Optional">
          <input
            id="member-student-id"
            className={INPUT_CLASS}
            value={form.student_id}
            onChange={(e) => updateField('student_id', e.target.value)}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField label="Role" htmlFor="member-role">
          <select
            id="member-role"
            className={INPUT_CLASS}
            value={form.role}
            onChange={(e) => updateField('role', e.target.value as Member['role'])}
          >
            {MEMBER_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Status" htmlFor="member-status">
          <select
            id="member-status"
            className={`${INPUT_CLASS} capitalize`}
            value={form.status}
            onChange={(e) => updateField('status', e.target.value as Member['status'])}
          >
            {MEMBER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="Joined on" htmlFor="member-joined" error={errors.joined_on}>
        <input
          id="member-joined"
          type="date"
          className={INPUT_CLASS}
          value={form.joined_on}
          onChange={(e) => updateField('joined_on', e.target.value)}
        />
      </FormField>

      <MemberAttendanceFields
        events={events}
        loading={attendanceLoading}
        error={attendanceError}
        value={attendance}
        disabled={saving}
        onChange={setEventAttendance}
        onSetAll={setAllAttendance}
      />

      {submitError && <p className="text-sm text-rose-600 dark:text-rose-400">{submitError}</p>}

      <div className="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-5">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : member ? 'Save changes' : 'Add member'}
        </Button>
      </div>
    </form>
  );
}