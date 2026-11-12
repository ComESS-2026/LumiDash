ALTER TABLE public.members ADD COLUMN IF NOT EXISTS source_id text;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS department text;

CREATE UNIQUE INDEX IF NOT EXISTS members_user_source_id_key
  ON public.members (user_id, source_id);

NOTIFY pgrst, 'reload schema';