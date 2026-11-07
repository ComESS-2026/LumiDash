import { CalendarPlus, Clock, MapPin, Pencil, Trash2, Users } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { CATEGORY_TONES } from '@/lib/tones';
import { formatDateTime } from '@/lib/format';
import type { ClubEvent } from '@/types/club';

interface EventCardProps {
  event: ClubEvent;
  isPast: boolean;
  onEdit: (event: ClubEvent) => void;
  onDelete: (event: ClubEvent) => void;
}

export default function EventCard({ event, isPast, onEdit, onDelete }: EventCardProps) {
  const start = new Date(event.starts_at);

  return (
    <article
      className={`group flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:items-center ${
        isPast ? 'opacity-75' : ''
      }`}
    >
      <div className="flex w-full shrink-0 items-center gap-4 sm:w-20 sm:flex-col sm:gap-0 sm:rounded-xl sm:bg-slate-900 sm:py-3 sm:text-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 sm:text-emerald-400">
          {start.toLocaleDateString(undefined, { month: 'short' })}
        </span>
        <span className="text-2xl font-semibold text-slate-900 sm:text-white">{start.getDate()}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-slate-900">{event.title}</h3>
          <Badge tone={CATEGORY_TONES[event.category]}>{event.category}</Badge>
        </div>
        {event.description && (
          <p className="mt-1 line-clamp-2 text-sm text-slate-600">{event.description}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {formatDateTime(event.starts_at)}
          </span>
          {event.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {event.location}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {event.capacity ? `Capacity ${event.capacity}` : 'No capacity limit'}
          </span>
        </div>
      </div>

      <div className="flex justify-end gap-1 sm:flex-col sm:items-end">
        <button
          type="button"
          onClick={() => onEdit(event)}
          aria-label={`Edit ${event.title}`}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(event)}
          aria-label={`Delete ${event.title}`}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

export function EventsEmptyState({ isPast }: { isPast: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
        <CalendarPlus className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-slate-900">
        {isPast ? 'No past events yet' : 'Nothing scheduled yet'}
      </p>
      <p className="text-sm text-slate-500">
        {isPast ? 'Completed events will show up here.' : 'Create an event to fill your calendar.'}
      </p>
    </div>
  );
}
