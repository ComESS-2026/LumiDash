/*
# Create club management schema (members and events)

1. New Tables
- `members`: the students in the club.
  - `id` (uuid, primary key)
  - `full_name` (text, required)
  - `email` (text, unique, required)
  - `student_id` (text, optional)
  - `role` (text: President, Vice President, Treasurer, Secretary, Officer, Member)
  - `status` (text: active, inactive, alumni)
  - `joined_on` (date, defaults to today)
  - `created_at` (timestamp)
- `events`: club meetings and activities.
  - `id` (uuid, primary key)
  - `title` (text, required)
  - `description` (text, optional)
  - `location` (text, optional)
  - `category` (text: Meeting, Social, Workshop, Competition, Fundraiser)
  - `starts_at` (timestamp, required)
  - `capacity` (integer, optional, must be greater than zero)
  - `created_at` (timestamp)

2. Security
- Row level security enabled on both tables.
- Since the app has no sign-in, `anon` and `authenticated` roles get full read and write access to both tables through the Data API.

3. Notes
- Indexes are added on the columns the dashboard sorts and filters by.
- Sample members and events are inserted with fixed ids so re-running this migration does not duplicate them.
*/

CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  student_id text,
  role text NOT NULL DEFAULT 'Member' CHECK (role IN ('President', 'Vice President', 'Treasurer', 'Secretary', 'Officer', 'Member')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'alumni')),
  joined_on date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  location text,
  category text NOT NULL DEFAULT 'Meeting' CHECK (category IN ('Meeting', 'Social', 'Workshop', 'Competition', 'Fundraiser')),
  starts_at timestamptz NOT NULL,
  capacity integer CHECK (capacity IS NULL OR capacity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS members_status_idx ON members (status);
CREATE INDEX IF NOT EXISTS members_role_idx ON members (role);
CREATE INDEX IF NOT EXISTS events_starts_at_idx ON events (starts_at);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON members TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON events TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_members" ON members;
CREATE POLICY "anon_select_members" ON members FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_members" ON members;
CREATE POLICY "anon_insert_members" ON members FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_members" ON members;
CREATE POLICY "anon_update_members" ON members FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_members" ON members;
CREATE POLICY "anon_delete_members" ON members FOR DELETE
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_events" ON events;
CREATE POLICY "anon_select_events" ON events FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_events" ON events;
CREATE POLICY "anon_insert_events" ON events FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_events" ON events;
CREATE POLICY "anon_update_events" ON events FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_events" ON events;
CREATE POLICY "anon_delete_events" ON events FOR DELETE
  TO anon, authenticated USING (true);

INSERT INTO members (id, full_name, email, student_id, role, status, joined_on) VALUES
  ('11111111-0000-4000-8000-000000000001', 'Maya Chen', 'maya.chen@university.edu', 'S10293841', 'President', 'active', '2025-09-02'),
  ('11111111-0000-4000-8000-000000000002', 'Jordan Patel', 'jordan.patel@university.edu', 'S10384756', 'Treasurer', 'active', '2025-09-02'),
  ('11111111-0000-4000-8000-000000000003', 'Sofia Rodriguez', 'sofia.r@university.edu', 'S10475638', 'Secretary', 'active', '2025-09-10'),
  ('11111111-0000-4000-8000-000000000004', 'Ethan Brooks', 'ethan.brooks@university.edu', 'S10566729', 'Member', 'active', '2025-10-01'),
  ('11111111-0000-4000-8000-000000000005', 'Amara Okafor', 'amara.okafor@university.edu', 'S10647810', 'Member', 'active', '2025-10-14'),
  ('11111111-0000-4000-8000-000000000006', 'Liam Nguyen', 'liam.nguyen@university.edu', 'S10728391', 'Member', 'inactive', '2025-11-03'),
  ('11111111-0000-4000-8000-000000000007', 'Priya Sharma', 'priya.sharma@university.edu', 'S10819264', 'Officer', 'active', '2025-09-18')
ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, title, description, location, category, starts_at, capacity) VALUES
  ('22222222-0000-4000-8000-000000000001', 'Weekly General Meeting', 'Open floor for updates, budget notes, and volunteer sign-ups.', 'Student Union, Room 204', 'Meeting', now() + interval '2 days', 40),
  ('22222222-0000-4000-8000-000000000002', 'Intro to Pitching Workshop', 'Hands-on session on structuring a five-minute pitch.', 'Business School Atrium', 'Workshop', now() + interval '6 days', 25),
  ('22222222-0000-4000-8000-000000000003', 'Autumn Mixer', 'Meet new members over coffee and games.', 'Courtyard Lounge', 'Social', now() + interval '11 days', 80),
  ('22222222-0000-4000-8000-000000000004', 'Hackathon Qualifier', 'Teams compete for a spot in the regional finals.', 'Engineering Hall, Lab B', 'Competition', now() + interval '18 days', 60),
  ('22222222-0000-4000-8000-000000000005', 'Bake Sale Fundraiser', 'Raise money for the spring conference trip.', 'Main Library Entrance', 'Fundraiser', now() - interval '4 days', NULL)
ON CONFLICT (id) DO NOTHING;
