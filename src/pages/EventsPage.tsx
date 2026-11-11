import { useMemo, useState } from 'react';
import { CalendarPlus, Download } from 'lucide-react';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { ErrorState, LoadingState } from '@/components/ui/AsyncState';
import PageHeader from '@/components/ui/PageHeader';
import EventCard, { EventsEmptyState } from '@/components/events/EventCard';
import EventFormModal from '@/components/events/EventFormModal';
import { useAuth } from '@/contexts/AuthContext';
import { useLoader } from '@/hooks/useLoader';
import { deleteEvent, importSheetEvents, listEvents } from '@/lib/clubApi';
import { fetchSheetEvents } from '@/lib/sheetEvents';
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
  const [importing, setImporting] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const { user } = useAuth();

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

  const handleImport = async () => {
    if (!user) return;
    setImporting(true);
    setImportNotice(null);
    setImportError(null);
    try {
      const { events: sheetEvents, skipped } = await fetchSheetEvents();
      const imported = await importSheetEvents(user.id, sheetEvents);
      const parts = [
        imported > 0
          ? `Imported ${imported} ${imported === 1 ? 'event' : 'events'} from the club sheet.`
          : 'Every event from the club sheet is already in your calendar.',
      ];
      if (skipped > 0) {
        parts.push(`${skipped} ${skipped === 1 ? 'row was' : 'rows were'} skipped because details were missing.`);
      }
      setImportNotice(parts.join(' '));
      reload();
    } catch {
      setImportError('We could not import events from the sheet. Please try again.');
    } finally {
      setImporting(false);
    }
  };

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
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={handleImport} disabled={importing || !user}>
              <Download className="h-4 w-4" />
              {importing ? 'Importing...' : 'Import past events from sheet'}
            </Button>
            <Button onClick={openCreate}>
              <CalendarPlus className="h-4 w-4" />
              New event
            </Button>
          </div>
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

      {importNotice && (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {importNotice}
        </p>
      )}
      {importError && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {importError}
        </p>
      )}

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
