import { useState } from 'react';
import type { FormEvent } from 'react';
import Button from '@/components/ui/Button';
import FormField, { INPUT_CLASS } from '@/components/ui/FormField';
import Modal from '@/components/ui/Modal';
import { createEvent, updateEvent } from '@/lib/clubApi';
import { toLocalDateTimeInput } from '@/lib/format';
import { EVENT_CATEGORIES } from '@/types/club';
import type { ClubEvent, EventInput } from '@/types/club';

interface EventFormModalProps {
  open: boolean;
  event: ClubEvent | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function EventFormModal({ open, event, onClose, onSaved }: EventFormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={event ? 'Edit event' : 'New event'}
      description={
        event ? 'Update the details for this event.' : 'Schedule a meeting, workshop, or social.'
      }
    >
      <EventForm key={event?.id ?? 'new'} event={event} onClose={onClose} onSaved={onSaved} />
    </Modal>
  );
}

interface EventFormState {
  title: string;
  category: ClubEvent['category'];
  starts_at: string;
  location: string;
  capacity: string;
  description: string;
}

type EventFormErrors = Partial<Record<keyof EventFormState, string>>;

function getInitialState(event: ClubEvent | null): EventFormState {
  if (!event) {
    const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    soon.setMinutes(0, 0, 0);
    return {
      title: '',
      category: 'Meeting',
      starts_at: toLocalDateTimeInput(soon.toISOString()),
      location: '',
      capacity: '',
      description: '',
    };
  }
  return {
    title: event.title,
    category: event.category,
    starts_at: toLocalDateTimeInput(event.starts_at),
    location: event.location ?? '',
    capacity: event.capacity?.toString() ?? '',
    description: event.description ?? '',
  };
}

function validate(form: EventFormState): EventFormErrors {
  const errors: EventFormErrors = {};
  if (!form.title.trim()) errors.title = 'Give the event a title.';
  if (!form.starts_at || Number.isNaN(new Date(form.starts_at).getTime())) {
    errors.starts_at = 'Choose a start date and time.';
  }
  if (form.capacity.trim() !== '') {
    const capacity = Number(form.capacity);
    if (!Number.isInteger(capacity) || capacity <= 0) {
      errors.capacity = 'Capacity must be a whole number greater than zero.';
    }
  }
  return errors;
}

interface EventFormProps {
  event: ClubEvent | null;
  onClose: () => void;
  onSaved: () => void;
}

function EventForm({ event, onClose, onSaved }: EventFormProps) {
  const fromSheet = Boolean(event?.source_id);
  const [form, setForm] = useState<EventFormState>(() => getInitialState(event));
  const [errors, setErrors] = useState<EventFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const updateField = <K extends keyof EventFormState>(key: K, value: EventFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload: EventInput = {
      title: form.title.trim(),
      category: form.category,
      starts_at: new Date(form.starts_at).toISOString(),
      location: form.location.trim() || null,
      capacity: form.capacity.trim() === '' ? null : Number(form.capacity),
      description: form.description.trim() || null,
    };

    setSaving(true);
    setSubmitError(null);
    try {
      if (event) {
        await updateEvent(event.id, payload);
      } else {
        await createEvent(payload);
      }
      onSaved();
    } catch {
      setSubmitError('We could not save this event. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {fromSheet && (
        <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:bg-sky-500/15 dark:text-sky-300">
          This event comes from the club sheet. Title and start time are controlled by the sheet, so change them there.
          Category, location, capacity and description can be edited here.
        </p>
      )}

      <FormField label="Title" htmlFor="event-title" error={errors.title}>
        <input
          id="event-title"
          disabled={fromSheet}
          className={INPUT_CLASS}
          value={form.title}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="e.g. Weekly General Meeting"
          autoFocus
        />
      </FormField>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField label="Category" htmlFor="event-category">
          <select
            id="event-category"
            className={INPUT_CLASS}
            value={form.category}
            onChange={(e) => updateField('category', e.target.value as ClubEvent['category'])}
          >
            {EVENT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Starts" htmlFor="event-starts" error={errors.starts_at}>
          <input
            id="event-starts"
            type="datetime-local"
            disabled={fromSheet}
            className={INPUT_CLASS}
            value={form.starts_at}
            onChange={(e) => updateField('starts_at', e.target.value)}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField label="Location" htmlFor="event-location" hint="Optional">
          <input
            id="event-location"
            className={INPUT_CLASS}
            value={form.location}
            onChange={(e) => updateField('location', e.target.value)}
            placeholder="Room, building, or link"
          />
        </FormField>
        <FormField label="Capacity" htmlFor="event-capacity" error={errors.capacity} hint="Leave blank for no limit">
          <input
            id="event-capacity"
            type="number"
            min={1}
            className={INPUT_CLASS}
            value={form.capacity}
            onChange={(e) => updateField('capacity', e.target.value)}
          />
        </FormField>
      </div>

      <FormField label="Description" htmlFor="event-description" hint="Optional">
        <textarea
          id="event-description"
          rows={3}
          className={INPUT_CLASS}
          value={form.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="What should members know before attending?"
        />
      </FormField>

      {submitError && <p className="text-sm text-rose-600 dark:text-rose-400">{submitError}</p>}

      <div className="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-5">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : event ? 'Save changes' : 'Create event'}
        </Button>
      </div>
    </form>
  );
}
