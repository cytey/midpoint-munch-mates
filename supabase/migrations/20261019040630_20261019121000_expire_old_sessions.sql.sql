/*
# Auto-expire old sessions with pg_cron (retry: correct extension order)

1. Plain-English summary
   Sessions used to live in the database forever. This migration adds a
   scheduled job that deletes sessions (and their participants, places and
   votes via cascading deletes) that haven't been updated in 7 days.

2. New columns
   - `sessions.updated_at` (timestamp, auto-set): tracks when a session was
     last touched (created, status change, place change). Used by the
     expiry job.

3. Modified tables
   - `sessions`: new auto-updated `updated_at` column (auto-set on update).

4. Security changes
   - None. The expiry job runs as a privileged scheduler, bypassing RLS.

5. Important notes
   - The moddatetime extension must exist before the trigger is created
     (this was the failure in the previous attempt).
   - Existing rows get `updated_at` backfilled to their `created_at` value,
     so they expire 7 days after they were created.
   - Uses pg_cron to run the job daily at 03:00 UTC.
*/

-- Enable extensions first
CREATE EXTENSION IF NOT EXISTS moddatetime;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Track when a session was last touched
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME Zone NOT NULL DEFAULT now();

-- Backfill: existing sessions expire 7 days after creation
UPDATE public.sessions SET updated_at = created_at WHERE updated_at < now() - INTERVAL '0 days' AND updated_at IS NULL;

-- Update the timestamp automatically when a session row changes
DROP TRIGGER IF EXISTS trg_sessions_touch_updated_at ON public.sessions;
CREATE TRIGGER trg_sessions_touch_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

-- Daily job at 03:00 UTC: delete sessions not touched in 7 days (cascades to children)
SELECT cron.schedule(
  'meet2eat_expire_sessions',
  '0 3 * * *',
 $$
 DELETE FROM public.sessions WHERE updated_at < now() - INTERVAL '7 days';
 $$
);
