-- Lets members be copied from the Google Sheet and kept in sync with it.
-- source_id is "sheet:<id>" for sheet members and NULL for members added in the app.
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS source_id text;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS department text;

CREATE UNIQUE INDEX IF NOT EXISTS members_user_source_id_key
  ON public.members (user_id, source_id);

-- Make the API notice the new columns right away
NOTIFY pgrst, 'reload schema';