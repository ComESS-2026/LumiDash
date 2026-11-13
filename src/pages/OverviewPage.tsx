import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  Loader2,
  PieChart,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import type { PageId } from '@/components/layout/Sidebar';
import { parseEventDate } from '@/lib/alerts';
import { loadAppClubData } from '@/lib/clubApi';
import { SHEET_BASE } from '@/lib/sheet';
import { EMPTY_APP_DATA, buildAttendanceSummary } from '@/lib/sheetAttendance';
import type { AppEventRef, AppMemberRef } from '@/lib/sheetAttendance';
import { normalizeStatus } from '@/lib/sheetMembers';
import { STATUS_TONES } from '@/lib/tones';
import { MEMBER_STATUSES } from '@/types/club';
import type { MemberStatus } from '@/types/club';

interface SheetMember {
  id: string;
  name: string;
  department: string;
  status: string;
}

interface SheetEvent {
  id: string;
  event_name: string;
  date: string;
  attendees_count: string;
}

interface SheetBudget {
  id: string;
  category: string;
  planned_amount: string;
  used_amount: string;
}

interface SheetAttendance {
  event_id: string;
  member_id: string;
  status: string;
}

interface DashboardData {
  members: SheetMember[];
  events: SheetEvent[];
  budget: SheetBudget[];
  attendance: SheetAttendance[];
  /** Members added in the web app (not in the sheet). */
  appMembers: AppMemberRef[];
  appEvents: AppEventRef[];
  attendeeDelta: Map<string, number>;
}

interface AttendanceRow {
  id: string;
  name: string;
  date: string;
  attendees: number;
}

interface OverviewPageProps {
  onNavigate: (page: PageId) => void;
}

function parseMoney(value: string): number {
  const amount = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(amount) ? amount : 0;
}

function parseCount(value: string): number {
  const count = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(count) ? count : 0;
}

/** A sortable YYYY-MM-DD for a date written in the sheet (any common format); the raw text if it can't be read. */
function sortableDate(value: string): string {
  const date = parseEventDate(value);
  if (!date) return String(value ?? '');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatMoney(amount: number): string {
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

interface StatCardProps {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  className?: string;
  /** Makes the whole card a button, for cards that open a breakdown. */
  onClick?: () => void;
  actionLabel?: string;
}

function StatCard({ label, value, hint, icon: Icon, className = '', onClick, actionLabel }: StatCardProps) {
  const classes = `group min-w-0 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 ${className}`;
  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-600 group-hover:text-white dark:bg-emerald-500/15 dark:text-emerald-300 dark:group-hover:bg-emerald-500 dark:group-hover:text-white">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 break-words text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      {actionLabel && (
        <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">{actionLabel} →</p>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-haspopup="dialog"
        className={`${classes} w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600`}
      >
        {content}
      </button>
    );
  }
  return <div className={classes}>{content}</div>;
}

const STATUS_BAR_CLASSES: Record<MemberStatus, string> = {
  active: 'bg-emerald-500',
  inactive: 'bg-amber-500',
  alumni: 'bg-slate-400 dark:bg-slate-500',
};

interface MemberBreakdownModalProps {
  open: boolean;
  total: number;
  counts: Record<MemberStatus, number>;
  onClose: () => void;
  onViewMembers: () => void;
}

function MemberBreakdownModal({ open, total, counts, onClose, onViewMembers }: MemberBreakdownModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Members by status"
      description="Members from the club sheet plus members added in the web app."
    >
      <div className="space-y-5">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total members</p>
          <p className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
            {total.toLocaleString('en-US')}
          </p>
        </div>

        <ul className="space-y-4">
          {MEMBER_STATUSES.map((status) => {
            const count = counts[status];
            const percent = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <li key={status}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <Badge tone={STATUS_TONES[status]}>{status}</Badge>
                  <p className="text-sm tabular-nums text-slate-700 dark:text-slate-200">
                    <span className="font-semibold text-slate-900 dark:text-white">{count.toLocaleString('en-US')}</span>
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{percent}%</span>
                  </p>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full ${STATUS_BAR_CLASSES[status]}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onViewMembers}>View members</Button>
        </div>
      </div>
    </Modal>
  );
}

function AttendanceBarChart({ events }: { events: AttendanceRow[] }) {
  const rows = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const max = Math.max(...rows.map((event) => event.attendees), 1);

  return (
    <div className="space-y-3" role="img" aria-label="จำนวนผู้เข้าร่วมในแต่ละกิจกรรม">
      {rows.map((event) => {
        const attendees = event.attendees;
        const width = Math.max((attendees / max) * 100, attendees > 0 ? 2 : 0);
        return (
          <div key={event.id}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
              <p className="truncate font-medium text-slate-700 dark:text-slate-200" title={event.name}>
                {event.name}
              </p>
              <p className="shrink-0 tabular-nums text-slate-500 dark:text-slate-400">
                {attendees.toLocaleString('en-US')} คน
              </p>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface BudgetRow {
  id: string;
  category: string;
  planned: number;
  used: number;
}

function GroupedBudgetChart({ rows }: { rows: BudgetRow[] }) {
  const max = Math.max(...rows.flatMap((row) => [row.planned, row.used]), 1);
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((ratio) => Math.round(max * ratio));

  return (
    <div role="img" aria-label="เปรียบเทียบงบที่วางแผนกับงบที่ใช้จริงแยกตามหมวดหมู่">
      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-sky-500" />
          งบที่วางแผน (planned)
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
          งบที่ใช้จริง (used)
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" />
          ใช้เกินแผน
        </span>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex gap-2" style={{ minWidth: `${Math.max(rows.length * 56 + 32, 240)}px` }}>
          <div className="flex h-56 flex-col justify-between py-0.5 text-right text-[10px] tabular-nums text-slate-400">
            {ticks.map((tick) => (
              <span key={tick}>{(tick / 1000).toFixed(0)}k</span>
            ))}
          </div>
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-x-0 top-0 flex h-56 flex-col justify-between">
              {ticks.map((tick) => (
                <div key={tick} className="border-t border-dashed border-slate-200 dark:border-slate-800" />
              ))}
            </div>
            <div className="relative flex h-56 items-end gap-3">
              {rows.map((row) => {
                const over = row.used > row.planned;
                return (
                  <div key={row.id} className="flex h-full min-w-0 flex-1 items-end justify-center gap-1">
                    <div
                      className="w-3.5 rounded-t bg-sky-500 sm:w-4"
                      style={{ height: `${(row.planned / max) * 100}%` }}
                      title={`${row.category} แผน ${formatMoney(row.planned)}`}
                    />
                    <div
                      className={`w-3.5 rounded-t sm:w-4 ${over ? 'bg-rose-500' : 'bg-amber-500'}`}
                      style={{ height: `${(row.used / max) * 100}%` }}
                      title={`${row.category} ใช้จริง ${formatMoney(row.used)}`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex gap-3">
              {rows.map((row) => (
                <p
                  key={row.id}
                  className="line-clamp-3 min-w-0 flex-1 text-center text-[10px] leading-snug text-slate-500 dark:text-slate-400"
                  title={`${row.category}: แผน ${formatMoney(row.planned)} / ใช้จริง ${formatMoney(row.used)}`}
                >
                  {row.category}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OverviewPage({ onNavigate }: OverviewPageProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const hasLoaded = useRef(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setReloadKey((key) => key + 1), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadDashboard() {
      if (!hasLoaded.current) setLoading(true);
      setError(null);
      try {
        const endpoints = ['Members', 'Events', 'Budget', 'Attendance'] as const;
        const responses = await Promise.all(
          endpoints.map((sheet) => fetch(`${SHEET_BASE}/${sheet}`, { signal: controller.signal })),
        );

        // The Attendance tab is optional: without it the dashboard still works.
        if (responses.slice(0, 3).some((response) => !response.ok)) {
          throw new Error('OpenSheet API ส่งสถานะไม่สำเร็จ');
        }

        const asRows = async <T,>(response: Response): Promise<T[]> => {
          if (!response.ok) return [];
          const body: unknown = await response.json();
          return Array.isArray(body) ? (body as T[]) : [];
        };
        const [members, events, budget, attendance] = await Promise.all([
          asRows<SheetMember>(responses[0]),
          asRows<SheetEvent>(responses[1]),
          asRows<SheetBudget>(responses[2]),
          asRows<SheetAttendance>(responses[3]),
        ]);

        let app = EMPTY_APP_DATA;
        try {
          app = await loadAppClubData();
        } catch {
          // keep showing sheet numbers
        }
        const { attendeeDelta } = buildAttendanceSummary(attendance, events, members, app);

        setData({
          members,
          events,
          budget,
          attendance,
          appMembers: app.members.filter((member) => !member.source_id),
          appEvents: app.events.filter((event) => !event.source_id),
          attendeeDelta,
        });
        hasLoaded.current = true;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (hasLoaded.current) return;
        setError(err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadDashboard();
    return () => controller.abort();
  }, [reloadKey]);

  const summary = useMemo(() => {
    if (!data) return null;

    const plannedTotal = data.budget.reduce((sum, row) => sum + parseMoney(row.planned_amount), 0);
    const usedTotal = data.budget.reduce((sum, row) => sum + parseMoney(row.used_amount), 0);
    const budgetRows: BudgetRow[] = data.budget.map((row) => ({
      id: row.id,
      category: row.category,
      planned: parseMoney(row.planned_amount),
      used: parseMoney(row.used_amount),
    }));

    const attendanceRows: AttendanceRow[] = [
      ...data.events.map((event) => ({
        id: `sheet:${event.id}`,
        name: event.event_name,
        date: sortableDate(event.date),
        attendees: Math.max(0, parseCount(event.attendees_count) + (data.attendeeDelta.get(`sheet:${event.id}`) ?? 0)),
      })),
      ...data.appEvents.map((event) => ({
        id: `app:${event.id}`,
        name: event.title,
        date: Number.isNaN(new Date(event.starts_at).getTime())
          ? ''
          : new Date(event.starts_at).toLocaleDateString('sv-SE'),
        attendees: Math.max(0, data.attendeeDelta.get(`app:${event.id}`) ?? 0),
      })),
    ];

    // Members by status: the sheet's members plus the ones added in the web app.
    const statusCounts: Record<MemberStatus, number> = { active: 0, inactive: 0, alumni: 0 };
    for (const member of data.members) statusCounts[normalizeStatus(member.status)] += 1;
    for (const member of data.appMembers) statusCounts[normalizeStatus(member.status)] += 1;

    return {
      statusCounts,
      memberCount: statusCounts.active + statusCounts.inactive + statusCounts.alumni,
      eventCount: data.events.length + data.appEvents.length,
      attendanceRows,
      plannedTotal,
      usedTotal,
      budgetRows,
      attendanceCount: data.attendance.length,
    };
  }, [data]);

  return (
    <div className="space-y-6 animate-fade-in sm:space-y-8">
      <PageHeader
        title="LumiDash"
        description="ภาพรวมสมาชิก กิจกรรม และงบประมาณของชมรม จาก OpenSheet"
        action={
          <button
            type="button"
            onClick={() => onNavigate('members')}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
          >
            <Users className="h-4 w-4" />
            สมาชิก
          </button>
        }
      />

      {loading && !data && (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600 dark:text-emerald-400" />
          กำลังดึงข้อมูลจาก OpenSheet...
        </div>
      )}

      {error && !data && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-12 text-center dark:border-rose-900/60 dark:bg-rose-950/40">
          <div>
            <p className="text-sm font-medium text-rose-800 dark:text-rose-200">โหลดแดชบอร์ดไม่สำเร็จ</p>
            <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-300 transition hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800"
          >
            ลองอีกครั้ง
          </button>
        </div>
      )}

      {summary && data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Total Members"
              value={summary.memberCount.toLocaleString('en-US')}
              hint={`Active ${summary.statusCounts.active} · Inactive ${summary.statusCounts.inactive} · Alumni ${summary.statusCounts.alumni}`}
              icon={Users}
              onClick={() => setBreakdownOpen(true)}
              actionLabel="คลิกเพื่อดูแยกตามสถานะ"
            />
            <StatCard
              label="Total Events Conducted"
              value={summary.eventCount.toLocaleString('en-US')}
              hint="จำนวนกิจกรรมทั้งหมดจากแท็บ Events รวมกิจกรรมที่เพิ่มในเว็บ"
              icon={CalendarDays}
            />
            <StatCard
              label="Total Budget Used"
              value={formatMoney(summary.usedTotal)}
              hint={`จากงบวางแผนทั้งหมด ${formatMoney(summary.plannedTotal)}`}
              icon={PieChart}
              className="sm:col-span-2 lg:col-span-1"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2">
            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <header className="mb-5">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">ผู้เข้าร่วมแต่ละกิจกรรม</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  จาก attendees_count ในชีต รวมผู้เข้าร่วมที่บันทึกในเว็บ
                </p>
              </header>
              {summary.attendanceRows.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">ยังไม่มีข้อมูลกิจกรรม</p>
              ) : (
                <AttendanceBarChart events={summary.attendanceRows} />
              )}
            </section>

            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <header className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">งบประมาณตามหมวดหมู่</h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Grouped bar chart เปรียบเทียบ planned_amount กับ used_amount
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('events')}
                  className="shrink-0 text-xs font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  ดูกิจกรรม
                </button>
              </header>
              {summary.budgetRows.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">ยังไม่มีข้อมูลงบประมาณ</p>
              ) : (
                <GroupedBudgetChart rows={summary.budgetRows} />
              )}
            </section>
          </div>

          <MemberBreakdownModal
            open={breakdownOpen}
            total={summary.memberCount}
            counts={summary.statusCounts}
            onClose={() => setBreakdownOpen(false)}
            onViewMembers={() => {
              setBreakdownOpen(false);
              onNavigate('members');
            }}
          />
        </>
      )}
    </div>
  );
}