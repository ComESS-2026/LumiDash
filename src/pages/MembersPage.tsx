import { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Search, UserPlus } from 'lucide-react';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { ErrorState, LoadingState } from '@/components/ui/AsyncState';
import PageHeader from '@/components/ui/PageHeader';
import MemberFormModal from '@/components/members/MemberFormModal';
import MembersTable from '@/components/members/MembersTable';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useLoader } from '@/hooks/useLoader';
import { deleteMember, listMembers, syncSheetMembers } from '@/lib/clubApi';
import type { SheetSyncResult } from '@/lib/clubApi';
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
  }, [membersVersion, reload]);

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

  const openCreate = () => {
    setEditingMember(null);
    setFormOpen(true);
  };

  const openEdit = (member: Member) => {
    setEditingMember(member);
    setFormOpen(true);
  };

  const handleSaved = () => {
    setFormOpen(false);
    reload();
  };

  const handleConfirmDelete = async () => {
    if (!deletingMember) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteMember(deletingMember.id);
      setDeletingMember(null);
      reload();
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
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {syncNotice}
        </p>
      )}
      {syncError && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {syncError}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or ID"
            aria-label="Search members"
            className="block w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-200/60 p-1" role="tablist">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={statusFilter === option}
              onClick={() => setStatusFilter(option)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium capitalize transition duration-150 ${
                statusFilter === option
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {loading && !members && <LoadingState />}
      {error && !members && <ErrorState message={error} onRetry={reload} />}
      {members && members.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <p className="text-sm font-medium text-slate-900">No members yet</p>
          <p className="mt-1 text-sm text-slate-500">Add your first member to start the roster.</p>
        </div>
      )}
      {members && members.length > 0 && filteredMembers.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <p className="text-sm font-medium text-slate-900">No members match your filters</p>
          <p className="mt-1 text-sm text-slate-500">Try a different search or status.</p>
        </div>
      )}
      {filteredMembers.length > 0 && (
        <MembersTable members={filteredMembers} onEdit={openEdit} onDelete={setDeletingMember} />
      )}

      <MemberFormModal
        open={formOpen}
        member={editingMember}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={deletingMember !== null}
        title="Remove member"
        message={`Remove ${deletingMember?.full_name ?? 'this member'} from the roster? This cannot be undone.`}
        busy={deleteBusy}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onCancel={closeDelete}
      />
    </div>
  );
}
