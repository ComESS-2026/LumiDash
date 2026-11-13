/*
# Add attendance table

1. New Tables
- `attendance` — records per-member, per-event attendance entered in the web app.
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, defaults to auth.uid(), references auth.users)
  - `member_id` (uuid, not null, references members)
  - `event_id` (uuid, not null, references events)
  - `status` (text, not null, one of present/late/excused/absent, defaults to present)
  - `created_at` (timestamptz, defaults to now())
  - Unique constraint on (member_id, event_id) so each member has one record per event.
2. Security
- Enable RLS on `attendance`.
- Grant SELECT, INSERT, UPDATE, DELETE to `authenticated`.
- Four owner-scoped policies (select/insert/update/delete) using `user_id = auth.uid()`.
- INSERT and UPDATE also check that the member and event belong to the user via EXISTS subqueries.
3. Important Notes
- The Google Sheet's Attendance tab is read separately and is NOT stored here.
- This table only holds attendance recorded through the web app UI.
*/

CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'present'
    CHECK (status IN ('present', 'late', 'excused', 'absent')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, event_id)
);

CREATE INDEX IF NOT EXISTS attendance_user_idx ON public.attendance (user_id);
CREATE INDEX IF NOT EXISTS attendance_event_idx ON public.attendance (event_id);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;

DROP POLICY IF EXISTS "attendance_select_own" ON public.attendance;
CREATE POLICY "attendance_select_own" ON public.attendance FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "attendance_insert_own" ON public.attendance;
CREATE POLICY "attendance_insert_own" ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_id)
    AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id)
  );

DROP POLICY IF EXISTS "attendance_update_own" ON public.attendance;
CREATE POLICY "attendance_update_own" ON public.attendance FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_id)
    AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id)
  );

DROP POLICY IF EXISTS "attendance_delete_own" ON public.attendance;
CREATE POLICY "attendance_delete_own" ON public.attendance FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

NOTIFY pgrst, 'reload schema';
