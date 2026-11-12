import { SHEET_BASE } from './sheet';
import { parseEventDate } from './alerts';

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
  /** Rows with an id, a title and a readable date. */
  events: SheetEventImport[];
  /** source_id of every sheet row that has an id, even if its date is unreadable. */
  presentSourceIds: string[];
  /** Rows that were ignored because the id, title or date was missing. */
  skipped: number;
}

/** Turns the raw rows of the sheet's Events tab into events the app can store. */
export function parseSheetEvents(body: unknown): SheetEventsResult {
  if (!Array.isArray(body)) throw new Error('The club sheet returned unexpected data.');

  const events: SheetEventImport[] = [];
  const presentSourceIds: string[] = [];
  let skipped = 0;

  for (const row of body as SheetEventRow[]) {
    const id = String(row.id ?? '').trim();
    const title = String(row.event_name ?? '').trim();
    if (id) presentSourceIds.push(`sheet:${id}`);

    const day = parseEventDate(row.date);
    if (!id || !title || !day) {
      skipped += 1;
      continue;
    }

    day.setHours(12, 0, 0, 0); // noon, so the day never shifts with the time zone
    events.push({ source_id: `sheet:${id}`, title, starts_at: day.toISOString() });
  }

  return { events, presentSourceIds, skipped };
}

export async function fetchSheetEvents(signal?: AbortSignal): Promise<SheetEventsResult> {
  const response = await fetch(`${SHEET_BASE}/Events`, { signal });
  if (!response.ok) throw new Error('The club sheet could not be reached.');
  return parseSheetEvents(await response.json());
}

export interface ExistingSheetEvent {
  id: string;
  source_id: string;
  title: string;
  starts_at: string;
}

export interface SheetSyncPlan {
  toInsert: SheetEventImport[];
  toUpdate: { id: string; title: string; starts_at: string }[];
  toDeleteIds: string[];
}

/**
 * Compares the sheet with the events already copied into the database.
 * The sheet is the source of truth for events that came from it.
 */
export function planSheetSync(existing: ExistingSheetEvent[], sheet: SheetEventsResult): SheetSyncPlan {
  const bySource = new Map(existing.map((row) => [row.source_id, row]));
  const present = new Set(sheet.presentSourceIds);

  const toInsert: SheetEventImport[] = [];
  const toUpdate: SheetSyncPlan['toUpdate'] = [];

  for (const event of sheet.events) {
    const row = bySource.get(event.source_id);
    if (!row) {
      toInsert.push(event);
    } else if (
      row.title !== event.title ||
      new Date(row.starts_at).getTime() !== new Date(event.starts_at).getTime()
    ) {
      toUpdate.push({ id: row.id, title: event.title, starts_at: event.starts_at });
    }
  }

  // An empty sheet is more likely a hiccup than a request to wipe everything.
  const toDeleteIds =
    sheet.presentSourceIds.length === 0
      ? []
      : existing.filter((row) => !present.has(row.source_id)).map((row) => row.id);

  return { toInsert, toUpdate, toDeleteIds };
}
