import { useMemo, useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { ErrorState, LoadingState } from '@/components/ui/AsyncState';
import PageHeader from '@/components/ui/PageHeader';
import EventCard, { EventsEmptyState } from '@/components/events/EventCard';
import EventFormModal from '@/components/events/EventFormModal';
import { useLoader } from '@/hooks/useLoader';
import { deleteEvent, listEvents } from '@/lib/clubApi';
import type { ClubEvent } from '@/types/club';

type Tab = 'upcoming' | 'past';

export default function EventsPage() {
  const { data: events, error, loading, reload } = useLoader(listEvents);
  const [tab, setTab] = useState<Tab>('upcoming');
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ClubEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<ClubEvent | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const all = events ?? [];
    return {
      upcoming: all.filter((event) => new Date(event.starts_at).getTime() >= now),
      past: all
        .filter((event) => new Date(event.starts_at).getTime() < now)
        .sort((a, b) => b.starts_at.localeCompare(a.starts_at)),
    };
  }, [events]);

  const visibleEvents = tab === 'upcoming' ? upcoming : past;

  const openCreate = () => {
    setEditingEvent(null);
    setFormOpen(true);
  };

  const openEdit = (event: ClubEvent) => {
    setEditingEvent(event);
    setFormOpen(true);
  };

  const handleSaved = () => {
    setFormOpen(false);
    reload();
  };

  const handleConfirmDelete = async () => {
    if (!deletingEvent) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteEvent(deletingEvent.id);
      setDeletingEvent(null);
      reload();
    } catch {
      setDeleteError('We could not delete this event. Please try again.');
    } finally {
      setDeleteBusy(false);
    }
  };

  const closeDelete = () => {
    if (deleteBusy) return;
    setDeletingEvent(null);
    setDeleteError(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Events"
        description="Plan meetings, workshops, and socials for your members."
        action={
          <Button onClick={openCreate}>
            <CalendarPlus className="h-4 w-4" />
            New event
          </Button>
        }
      />

      <div className="inline-flex gap-1 rounded-lg bg-slate-200/60 p-1" role="tablist">
        {(['upcoming', 'past'] as const).map((option) => {
          const count = option === 'upcoming' ? upcoming.length : past.length;
          return (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={tab === option}
              onClick={() => setTab(option)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition duration-150 ${
                tab === option ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {option}
              <span className="ml-2 text-xs text-slate-400">{count}</span>
            </button>
          );
        })}
      </div>

      {loading && !events && <LoadingState />}
      {error && !events && <ErrorState message={error} onRetry={reload} />}
      {events && visibleEvents.length === 0 && <EventsEmptyState isPast={tab === 'past'} />}
      {visibleEvents.length > 0 && (
        <div className="grid gap-4">
          {visibleEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              isPast={tab === 'past'}
              onEdit={openEdit}
              onDelete={setDeletingEvent}
            />
          ))}
        </div>
      )}

      <EventFormModal
        open={formOpen}
        event={editingEvent}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={deletingEvent !== null}
        title="Delete event"
        message={`Delete "${deletingEvent?.title ?? 'this event'}"? This cannot be undone.`}
        busy={deleteBusy}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onCancel={closeDelete}
      />
    </div>
  );
}
