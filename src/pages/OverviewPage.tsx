import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Loader2,
  PieChart,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import type { PageId } from '@/components/layout/Sidebar';

const SHEET_ID = '1cu5fSI8P6XUdrtwLIrDR-LmQCQqbTvxg1HYCl1a0V2g';
const SHEET_BASE = `https://opensheet.elk.sh/${SHEET_ID}`;

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

function formatMoney(amount: number): string {
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

interface StatCardProps {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
}

function StatCard({ label, value, hint, icon: Icon }: StatCardProps) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-600 group-hover:text-white dark:bg-emerald-500/15 dark:text-emerald-300 dark:group-hover:bg-emerald-500 dark:group-hover:text-white">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
    </div>
  );
}

function AttendanceBarChart({ events }: { events: SheetEvent[] }) {
  const rows = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const max = Math.max(...rows.map((event) => parseCount(event.attendees_count)), 1);

  return (
    <div className="space-y-3" role="img" aria-label="จำนวนผู้เข้าร่วมในแต่ละกิจกรรม">
      {rows.map((event) => {
        const attendees = parseCount(event.attendees_count);
        const width = Math.max((attendees / max) * 100, attendees > 0 ? 2 : 0);
        return (
          <div key={event.id}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
              <p className="truncate font-medium text-slate-700 dark:text-slate-200" title={event.event_name}>
                {event.event_name}
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
        <div className="flex min-w-[720px] gap-2">
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

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      setLoading(true);
      setError(null);
      try {
        const endpoints = ['Members', 'Events', 'Budget', 'Attendance'] as const;
        const responses = await Promise.all(
          endpoints.map((sheet) => fetch(`${SHEET_BASE}/${sheet}`, { signal: controller.signal })),
        );

        if (responses.some((response) => !response.ok)) {
          throw new Error('OpenSheet API ส่งสถานะไม่สำเร็จ');
        }

        const [members, events, budget, attendance] = (await Promise.all(
          responses.map((response) => response.json()),
        )) as [SheetMember[], SheetEvent[], SheetBudget[], SheetAttendance[]];

        setData({ members, events, budget, attendance });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
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

    return {
      memberCount: data.members.length,
      eventCount: data.events.length,
      plannedTotal,
      usedTotal,
      budgetRows,
      attendanceCount: data.attendance.length,
    };
  }, [data]);

  return (
    <div className="space-y-8 animate-fade-in">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Total Active Members"
              value={summary.memberCount.toLocaleString('en-US')}
              hint="จำนวนสมาชิกทั้งหมดจากแท็บ Members"
              icon={Users}
            />
            <StatCard
              label="Total Events Conducted"
              value={summary.eventCount.toLocaleString('en-US')}
              hint="จำนวนกิจกรรมทั้งหมดจากแท็บ Events"
              icon={CalendarDays}
            />
            <StatCard
              label="Total Budget Used"
              value={formatMoney(summary.usedTotal)}
              hint={`จากงบวางแผนทั้งหมด ${formatMoney(summary.plannedTotal)}`}
              icon={PieChart}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <header className="mb-5">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">ผู้เข้าร่วมแต่ละกิจกรรม</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Bar chart จาก attendees_count และ event_name
                </p>
              </header>
              {data.events.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">ยังไม่มีข้อมูลกิจกรรม</p>
              ) : (
                <AttendanceBarChart events={data.events} />
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
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
        </>
      )}
    </div>
  );
}