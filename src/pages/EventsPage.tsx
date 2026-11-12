import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarPlus, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { ErrorState, LoadingState } from '@/components/ui/AsyncState';
import PageHeader from '@/components/ui/PageHeader';
import EventCard, { EventsEmptyState } from '@/components/events/EventCard';
import EventFormModal from '@/components/events/EventFormModal';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useLoader } from '@/hooks/useLoader';
import { deleteEvent, listEvents, syncSheetEvents } from '@/lib/clubApi';
import type { SheetSyncResult } from '@/lib/clubApi';
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
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const { user } = useAuth();
  const { eventsVersion, refresh } = useNotifications();

  // The background check copies sheet changes into the database; show them right away.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    void reload();
  }, [eventsVersion, reload]);

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

  const describeSync = (result: SheetSyncResult, skipped: number) => {
    const changes = [
      result.added > 0 ? `${result.added} added` : null,
      result.updated > 0 ? `${result.updated} updated` : null,
      result.removed > 0 ? `${result.removed} removed` : null,
    ].filter(Boolean);
    const parts = [
      changes.length > 0
        ? `Synced with the club sheet: ${changes.join(', ')}.`
        : 'Already up to date with the club sheet.',
    ];
    if (skipped > 0) {
      parts.push(`${skipped} ${skipped === 1 ? 'row was' : 'rows were'} skipped because details were missing.`);
    }
    return parts.join(' ');
  };

  const handleSync = async () => {
    if (!user) return;
    setSyncing(true);
    setSyncNotice(null);
    setSyncError(null);
    try {
      const sheet = await fetchSheetEvents();
      const result = await syncSheetEvents(user.id, sheet);
      setSyncNotice(describeSync(result, sheet.skipped));
      void reload();
      refresh();
    } catch {
      setSyncError('We could not sync events from the sheet. Please try again.');
    } finally {
      setSyncing(false);
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
            <Button variant="secondary" onClick={handleSync} disabled={syncing || !user}>
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync from sheet'}
            </Button>
            <Button onClick={openCreate}>
              <CalendarPlus className="h-4 w-4" />
              New event
            </Button>
          </div>
        }
      />

      <div className="inline-flex gap-1 rounded-lg bg-slate-200/60 dark:bg-slate-800/60 p-1" role="tablist">
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
                tab === option ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {option}
              <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">{count}</span>
            </button>
          );
        })}
      </div>

      {syncNotice && (
        <p role="status" className="rounded-lg bg-emerald-50 dark:bg-emerald-500/15 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300">
          {syncNotice}
        </p>
      )}
      {syncError && (
        <p role="alert" className="rounded-lg bg-rose-50 dark:bg-rose-500/15 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          {syncError}
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
