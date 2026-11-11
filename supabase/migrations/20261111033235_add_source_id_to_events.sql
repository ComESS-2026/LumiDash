/*
# Track events imported from the club sheet

1. Modified tables
- `events`: new `source_id` text column. It holds the row id of an event copied from the club's Google Sheet. Events created in the app leave it empty.

2. Security
- No change to access rules. The existing per-owner policies still apply to every row.

3. Important notes
- A unique index on (user_id, source_id) stops the same sheet event from being imported twice into one account.
- Rows with an empty source_id are not affected by the unique index.
*/

ALTER TABLE events ADD COLUMN IF NOT EXISTS source_id text;

CREATE UNIQUE INDEX IF NOT EXISTS events_user_source_id_key ON events (user_id, source_id);
