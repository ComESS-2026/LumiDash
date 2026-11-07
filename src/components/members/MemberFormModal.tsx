import { useState } from 'react';
import type { FormEvent } from 'react';
import Button from '@/components/ui/Button';
import FormField, { INPUT_CLASS } from '@/components/ui/FormField';
import Modal from '@/components/ui/Modal';
import { createMember, updateMember } from '@/lib/clubApi';
import { MEMBER_ROLES, MEMBER_STATUSES } from '@/types/club';
import type { Member, MemberInput } from '@/types/club';

interface MemberFormModalProps {
  open: boolean;
  member: Member | null;
  onClose: () => void;
  onSaved: () => void;
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

export default function MemberFormModal({ open, member, onClose, onSaved }: MemberFormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={member ? 'Edit member' : 'Add member'}
      description={
        member ? 'Update details and role for this member.' : 'Add a new student to your club roster.'
      }
    >
      <MemberForm key={member?.id ?? 'new'} member={member} onClose={onClose} onSaved={onSaved} />
    </Modal>
  );
}

interface MemberFormProps {
  member: Member | null;
  onClose: () => void;
  onSaved: () => void;
}

function MemberForm({ member, onClose, onSaved }: MemberFormProps) {
  const [form, setForm] = useState<FormState>(() => getInitialState(member));
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
      if (member) {
        await updateMember(member.id, payload);
      } else {
        await createMember(payload);
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

      {submitError && <p className="text-sm text-rose-600">{submitError}</p>}

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
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
