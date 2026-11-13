import { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Search, UserPlus } from 'lucide-react';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { ErrorState, LoadingState } from '@/components/ui/AsyncState';
import PageHeader from '@/components/ui/PageHeader';
import MemberFormModal from '@/components/members/MemberFormModal';
import AttendanceModal from '@/components/members/AttendanceModal';
import MembersTable from '@/components/members/MembersTable';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useLoader } from '@/hooks/useLoader';
import { useSheetAttendance } from '@/hooks/useSheetAttendance';
import { deleteMember, listMembers, syncSheetMembers } from '@/lib/clubApi';
import type { SheetSyncResult } from '@/lib/clubApi';
import { memberKeyOf } from '@/lib/sheetAttendance';
import { fetchSheetMembers } from '@/lib/sheetMembers';
import { MEMBER_STATUSES } from '@/types/club';
import type { Member, MemberStatus } from '@/types/club';

type StatusFilter = 'all' | MemberStatus;

const FILTER_OPTIONS: StatusFilter[] = ['all', ...MEMBER_STATUSES];

export default function MembersPage() {
  const { data: members, error, loading, reload } = useLoader(listMembers);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deletingMember, setDeletingMember] = useState<Member | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [attendanceMember, setAttendanceMember] = useState<Member | null>(null);
  const { summary: attendance, error: attendanceError, reload: reloadAttendance } = useSheetAttendance();
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const { user } = useAuth();
  const { membersVersion, refresh } = useNotifications();

  // The background check copies sheet changes into the database; show them right away.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    void reload();
    reloadAttendance(); // new or removed members change the attendance numbers too
  }, [membersVersion, reload, reloadAttendance]);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (members ?? []).filter((member) => {
      if (statusFilter !== 'all' && member.status !== statusFilter) return false;
      if (!query) return true;
      return (
        member.full_name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        (member.student_id ?? '').toLowerCase().includes(query)
      );
    });
  }, [members, search, statusFilter]);

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
      parts.push(`${skipped} ${skipped === 1 ? 'row was' : 'rows were'} skipped (missing or repeated id, name or date).`);
    }
    if (result.failed > 0) {
      parts.push(`${result.failed} could not be saved (for example an email that is already used).`);
    }
    return parts.join(' ');
  };

  const handleSync = async () => {
    if (!user) return;
    setSyncing(true);
    setSyncNotice(null);
    setSyncError(null);
    try {
      const sheet = await fetchSheetMembers();
      const result = await syncSheetMembers(user.id, sheet);
      setSyncNotice(describeSync(result, sheet.skipped));
      void reload();
      refresh();
    } catch (err) {
      const detail = err instanceof Error ? ` (${err.message})` : '';
      setSyncError(`We could not sync members from the sheet${detail}.`);
    } finally {
      setSyncing(false);
    }
  };

  const averageRate = useMemo(() => {
    if (!attendance || attendance.totalEvents === 0) return null;
    const rates = (members ?? [])
      .map((member) => attendance.byMember.get(memberKeyOf(member)))
      .filter((record): record is NonNullable<typeof record> => record !== undefined && record.total > 0);
    if (rates.length === 0) return null;
    return Math.round(rates.reduce((sum, record) => sum + record.rate, 0) / rates.length);
  }, [attendance, members]);

  const openCreate = () => {
    setEditingMember(null);
    setFormOpen(true);
  };

  const openEdit = (member: Member) => {
    setEditingMember(member);
    setFormOpen(true);
  };

  const handleChanged = () => {
    reload();
    reloadAttendance();
  };

  const handleSaved = () => {
    setFormOpen(false);
    handleChanged();
  };

  const handleConfirmDelete = async () => {
    if (!deletingMember) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteMember(deletingMember.id);
      setDeletingMember(null);
      handleChanged();
    } catch {
      setDeleteError('We could not delete this member. Please try again.');
    } finally {
      setDeleteBusy(false);
    }
  };

  const closeDelete = () => {
    if (deleteBusy) return;
    setDeletingMember(null);
    setDeleteError(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Members"
        description="Keep your club roster, roles, and standing up to date."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={handleSync} disabled={syncing || !user}>
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync from sheet'}
            </Button>
            <Button onClick={openCreate}>
              <UserPlus className="h-4 w-4" />
              Add member
            </Button>
          </div>
        }
      />

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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or ID"
            aria-label="Search members"
            className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-white shadow-sm transition placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-200/60 dark:bg-slate-800/60 p-1" role="tablist">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={statusFilter === option}
              onClick={() => setStatusFilter(option)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium capitalize transition duration-150 ${
                statusFilter === option
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {attendance && attendance.totalEvents > 0 && (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Each percentage counts only the events recorded for that member
          {averageRate !== null && (
            <>
              {' '}
              · average <span className="font-medium text-slate-900 dark:text-white">{averageRate}%</span>
            </>
          )}
          {' '}
          · {attendance.totalEvents} {attendance.totalEvents === 1 ? 'event has' : 'events have'} attendance records.
          Click the calendar icon on a member to see their history.
        </p>
      )}
      {attendanceError && !attendance && (
        <p role="status" className="rounded-lg bg-amber-50 dark:bg-amber-500/15 px-3 py-2 text-sm text-amber-900 dark:text-amber-300">
          Attendance could not be loaded from the club sheet. {attendanceError}
        </p>
      )}

      {loading && !members && <LoadingState />}
      {error && !members && <ErrorState message={error} onRetry={reload} />}
      {members && members.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-16 text-center">
          <p className="text-sm font-medium text-slate-900 dark:text-white">No members yet</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Add your first member to start the roster.</p>
        </div>
      )}
      {members && members.length > 0 && filteredMembers.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-16 text-center">
          <p className="text-sm font-medium text-slate-900 dark:text-white">No members match your filters</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try a different search or status.</p>
        </div>
      )}
      {filteredMembers.length > 0 && (
        <MembersTable
          members={filteredMembers}
          attendance={attendance}
          onEdit={openEdit}
          onDelete={setDeletingMember}
          onViewAttendance={setAttendanceMember}
        />
      )}

      <AttendanceModal
        member={attendanceMember}
        attendance={
          attendanceMember && attendance ? attendance.byMember.get(memberKeyOf(attendanceMember)) : undefined
        }
        onClose={() => setAttendanceMember(null)}
      />

      <MemberFormModal
        open={formOpen}
        member={editingMember}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
        onChanged={handleChanged}
      />

      <ConfirmDialog
        open={deletingMember !== null}
        title="Remove member"
        message={`Remove ${deletingMember?.full_name ?? 'this member'} from the roster? This cannot be undone.${
          deletingMember?.source_id
            ? ' This member comes from the club sheet, so they will be added back at the next sync unless you also delete their row in the sheet.'
            : ''
        }`}
        busy={deleteBusy}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onCancel={closeDelete}
      />
    </div>
  );
}