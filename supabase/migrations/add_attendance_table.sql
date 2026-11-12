-- LumiDash: add the attendance table.
-- Run this once in the Supabase SQL Editor. It needs the members and events tables to exist already.
-- Safe to run more than once.

-- ---------- ATTENDANCE (recorded in the web app) ----------
-- One row per member and event. The Google Sheet's Attendance tab is read separately and is not stored here.
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
DROP POLICY IF EXISTS "attendance_insert_own" ON public.attendance;
DROP POLICY IF EXISTS "attendance_update_own" ON public.attendance;
DROP POLICY IF EXISTS "attendance_delete_own" ON public.attendance;

-- The EXISTS checks only see the user's own members and events (they have row level security too),
-- so attendance can only be attached to the user's own rows.
CREATE POLICY "attendance_select_own" ON public.attendance FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "attendance_insert_own" ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_id)
    AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id)
  );
CREATE POLICY "attendance_update_own" ON public.attendance FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_id)
    AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id)
  );
CREATE POLICY "attendance_delete_own" ON public.attendance FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

NOTIFY pgrst, 'reload schema';
