import { useMemo, useState } from 'react';
import { Search, UserPlus } from 'lucide-react';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { ErrorState, LoadingState } from '@/components/ui/AsyncState';
import PageHeader from '@/components/ui/PageHeader';
import MemberFormModal from '@/components/members/MemberFormModal';
import MembersTable from '@/components/members/MembersTable';
import { useLoader } from '@/hooks/useLoader';
import { deleteMember, listMembers } from '@/lib/clubApi';
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
          <Button onClick={openCreate}>
            <UserPlus className="h-4 w-4" />
            Add member
          </Button>
        }
      />

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
