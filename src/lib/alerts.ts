export type AlertLevel = 'danger' | 'info';

export interface AppAlert {
  id: string;
  level: AlertLevel;
  title: string;
  message: string;
  detail?: string;
}

// Raw rows as they come from the Google Sheet (every value is a string).
export interface BudgetRowRaw {
  planned_amount?: string;
  used_amount?: string;
}

export interface EventRowRaw {
  id?: string;
  event_name?: string;
  date?: string;
}

// Events created on the app's Events page (Supabase `events` table).
export interface AppEventRow {
  id: string;
  title: string;
  starts_at: string;
}

export const BUDGET_ALERT_PERCENT = 80;
export const EVENT_ALERT_DAYS = 3;

const MS_PER_DAY = 86_400_000;

function toNumber(value: unknown): number {
  const amount = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(amount) ? amount : 0;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function parseEventDate(value: unknown): Date | null {
  const text = String(value ?? '').trim();
  if (!text) return null;

  // 2026-11-14 (optionally followed by a time)
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/.exec(text);
  if (iso) return toLocalDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  // 14/11/2026, 14-11-2026 or 14.11.2026 (day first, as in Thai sheets).
  // If the second number is above 12 it must be month/day/year instead.
  const slashed = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(text);
  if (slashed) {
    const first = Number(slashed[1]);
    const second = Number(slashed[2]);
    const [day, month] = second > 12 ? [second, first] : [first, second];
    return toLocalDate(Number(slashed[3]), month, day);
  }

  // Anything else the browser understands, e.g. "14 Nov 2026"
  const fallback = new Date(text);
  return Number.isNaN(fallback.getTime()) ? null : startOfDay(fallback);
}

function toLocalDate(year: number, month: number, day: number): Date | null {
  let fullYear = year;
  if (fullYear < 100) fullYear += 2000;
  if (fullYear > 2400) fullYear -= 543; // Buddhist Era (e.g. 2569 -> 2026)
  const date = new Date(fullYear, month - 1, day);
  const valid =
    date.getFullYear() === fullYear && date.getMonth() === month - 1 && date.getDate() === day;
  return valid ? date : null;
}

function describeDays(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

interface UpcomingCandidate {
  key: string;
  name: string;
  date: Date;
  label: string;
}

function formatDay(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Turns the club data into alerts. Nothing is hardcoded: an alert exists
 * only while its condition is true for the data passed in.
 *
 * - sheetEvents: rows from the Google Sheet "Events" tab
 * - appEvents:   events created on the app's Events page (Supabase)
 */
export function computeAlerts(
  budget: BudgetRowRaw[],
  sheetEvents: EventRowRaw[],
  appEvents: AppEventRow[] = [],
  now: Date = new Date(),
): AppAlert[] {
  const alerts: AppAlert[] = [];

  // 1) Budget used / budget planned > 80%
  const planned = budget.reduce((sum, row) => sum + toNumber(row.planned_amount), 0);
  const used = budget.reduce((sum, row) => sum + toNumber(row.used_amount), 0);
  const percent = planned > 0 ? (used / planned) * 100 : 0;

  if (percent > BUDGET_ALERT_PERCENT) {
    alerts.push({
      id: 'budget-over-80',
      level: 'danger',
      title: 'Budget alert',
      message: 'Warning: Budget usage has exceeded 80%!',
      detail: `${percent.toFixed(1)}% of the planned budget is used.`,
    });
  }

  // 2) Any event from today up to 3 days ahead, from the sheet or the app
  const candidates: UpcomingCandidate[] = [];

  for (const event of sheetEvents) {
    const date = parseEventDate(event.date);
    if (!date) continue;
    const name = event.event_name?.trim() || 'An event';
    candidates.push({ key: `${name.toLowerCase()}|${date.getTime()}`, name, date, label: formatDay(date) });
  }

  for (const event of appEvents) {
    const start = new Date(event.starts_at);
    if (Number.isNaN(start.getTime())) continue;
    const date = startOfDay(start);
    const name = event.title?.trim() || 'An event';
    const time = start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    candidates.push({
      key: `${name.toLowerCase()}|${date.getTime()}`,
      name,
      date,
      label: `${formatDay(date)}, ${time}`,
    });
  }

  const today = startOfDay(now);
  const seen = new Set<string>();
  const upcoming: { days: number; alert: AppAlert }[] = [];

  for (const candidate of candidates) {
    if (seen.has(candidate.key)) continue; // same event in the sheet and the app
    seen.add(candidate.key);

    const days = Math.round((candidate.date.getTime() - today.getTime()) / MS_PER_DAY);
    if (days < 0 || days > EVENT_ALERT_DAYS) continue;

    upcoming.push({
      days,
      alert: {
        id: `event-${candidate.key}`,
        level: 'info',
        title: 'Upcoming event',
        message: `Reminder: ${candidate.name} is ${describeDays(days)}.`,
        detail: `Date: ${candidate.label}`,
      },
    });
  }

  upcoming.sort((a, b) => a.days - b.days);
  upcoming.forEach((item) => alerts.push(item.alert));

  return alerts;
}
