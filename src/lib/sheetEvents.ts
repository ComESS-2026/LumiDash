import { SHEET_BASE } from '@/lib/sheet';

export interface SheetEventImport {
  source_id: string;
  title: string;
  starts_at: string;
}

interface SheetEventRow {
  id?: unknown;
  event_name?: unknown;
  date?: unknown;
}

export interface SheetEventsResult {
  events: SheetEventImport[];
  skipped: number;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function fetchSheetEvents(): Promise<SheetEventsResult> {
  const response = await fetch(`${SHEET_BASE}/Events`);
  if (!response.ok) throw new Error('The club sheet could not be reached.');

  const body: unknown = await response.json();
  if (!Array.isArray(body)) throw new Error('The club sheet returned unexpected data.');

  const events: SheetEventImport[] = [];
  let skipped = 0;

  for (const row of body as SheetEventRow[]) {
    const id = typeof row.id === 'string' ? row.id.trim() : '';
    const title = typeof row.event_name === 'string' ? row.event_name.trim() : '';
    const date = typeof row.date === 'string' ? row.date.trim() : '';
    const start = DATE_PATTERN.test(date) ? new Date(`${date}T12:00:00`) : null;

    if (!id || !title || !start || Number.isNaN(start.getTime())) {
      skipped += 1;
      continue;
    }
    events.push({ source_id: `sheet:${id}`, title, starts_at: start.toISOString() });
  }

  return { events, skipped };
}
