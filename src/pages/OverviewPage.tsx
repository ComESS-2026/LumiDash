import { ArrowRight, CalendarDays, MapPin, ShieldCheck, UserPlus, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import PageHeader from '@/components/ui/PageHeader';
import { ErrorState, LoadingState } from '@/components/ui/AsyncState';
import type { PageId } from '@/components/layout/Sidebar';
import { formatDate, formatDateTime, getInitials } from '@/lib/format';
import { listEvents, listMembers } from '@/lib/clubApi';
import { useLoader } from '@/hooks/useLoader';
import { CATEGORY_TONES, ROLE_TONES } from '@/lib/tones';
import type { ClubEvent, Member } from '@/types/club';

interface OverviewPageProps {
  onNavigate: (page: PageId) => void;
}

interface StatCardProps {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
}

function StatCard({ label, value, hint, icon: Icon }: StatCardProps) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-600 group-hover:text-white">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function computeStats(members: Member[], events: ClubEvent[]) {
  const now = new Date();
  const activeMembers = members.filter((member) => member.status === 'active');
  const officers = activeMembers.filter((member) => member.role !== 'Member');
  const upcoming = events.filter((event) => new Date(event.starts_at) >= now);
  const thisMonth = upcoming.filter((event) => {
    const start = new Date(event.starts_at);
    return start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear();
  });
  return {
    activeCount: activeMembers.length,
    officerCount: officers.length,
    upcoming,
    thisMonthCount: thisMonth.length,
  };
}

export default function OverviewPage({ onNavigate }: OverviewPageProps) {
  const members = useLoader(listMembers);
  const events = useLoader(listEvents);

  const isLoading = members.loading || events.loading;
  const loadError = members.error ?? events.error;

  if (isLoading && !members.data && !events.data) {
    return <LoadingState />;
  }

  if (loadError || !members.data || !events.data) {
    return (
      <ErrorState
        message={loadError ?? 'Unexpected response from the server.'}
        onRetry={() => {
          members.reload();
          events.reload();
        }}
      />
    );
  }

  const stats = computeStats(members.data, events.data);
  const upcomingPreview = stats.upcoming.slice(0, 4);
  const recentMembers = [...members.data]
    .sort((a, b) => b.joined_on.localeCompare(a.joined_on))
    .slice(0, 5);

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Overview"
        description="A quick look at your members and what is coming up."
        action={
          <Button onClick={() => onNavigate('members')}>
            <UserPlus className="h-4 w-4" />
            Manage members
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active members" value={stats.activeCount} hint="Currently in good standing" icon={Users} />
        <StatCard label="Officers" value={stats.officerCount} hint="Active leadership roles" icon={ShieldCheck} />
        <StatCard label="Upcoming events" value={stats.upcoming.length} hint="Scheduled from today" icon={CalendarDays} />
        <StatCard label="Events this month" value={stats.thisMonthCount} hint="Remaining this month" icon={CalendarDays} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-3">
          <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Upcoming events</h2>
            <button
              type="button"
              onClick={() => onNavigate('events')}
              className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 transition hover:text-emerald-800"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </button>
          </header>
          {upcomingPreview.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-slate-500">
              No upcoming events. Schedule one from the Events page.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcomingPreview.map((event) => (
                <li key={event.id} className="flex items-start gap-4 px-6 py-4 transition hover:bg-slate-50">
                  <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-slate-100 py-2 text-center">
                    <span className="text-xs font-medium uppercase text-slate-500">
                      {new Date(event.starts_at).toLocaleDateString(undefined, { month: 'short' })}
                    </span>
                    <span className="text-xl font-semibold text-slate-900">
                      {new Date(event.starts_at).getDate()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-slate-900">{event.title}</p>
                      <Badge tone={CATEGORY_TONES[event.category]}>{event.category}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{formatDateTime(event.starts_at)}</p>
                    {event.location && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="truncate">{event.location}</span>
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Newest members</h2>
            <button
              type="button"
              onClick={() => onNavigate('members')}
              className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 transition hover:text-emerald-800"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </button>
          </header>
          {recentMembers.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-slate-500">No members yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentMembers.map((member) => (
                <li key={member.id} className="flex items-center gap-3 px-6 py-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                    {getInitials(member.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{member.full_name}</p>
                    <p className="text-xs text-slate-500">Joined {formatDate(member.joined_on)}</p>
                  </div>
                  <Badge tone={ROLE_TONES[member.role]}>{member.role}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
