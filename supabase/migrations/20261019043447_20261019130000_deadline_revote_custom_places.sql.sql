/*
# Voting deadline, re-vote, and custom places

1. Plain-English summary
   Adds three group features:
   - A voting countdown: a session can carry a "vote deadline" timestamp.
     A scheduler job checks every minute and, once the deadline passes,
     locks in the currently top-voted place automatically.
   - Re-vote ("start another round"): a database function that safely
     unlocks a confirmed session — clears the confirmed spot and the votes,
     keeps all participants and the place list — so a group can vote again
     without creating a new session. This is the ONLY way a confirmed
     session can be changed; all other confirmed-session updates remain
     frozen.
   - Custom places: participants can add a place the search missed even
     while the session is in the voting phase (previously places could only
     be added during the gathering phase).

2. New columns
   - `sessions.vote_deadline_at` (timestamp, nullable): when voting should
     auto-finish. Null means no timer.

3. New functions
   - `start_revote(p_session_id)`: resets a confirmed session back to
     voting, clearing the confirmed place, deadline, and all votes.
   - `finish_expired_votes()`: for every voting session past its deadline,
     confirms the top-voted place. If a session has no votes at all, the
     timer is cleared and the session returns to the gathering phase so
     the group can search again.

4. Modified tables
   - `sessions`: new `vote_deadline_at` column (see above).

5. Security changes
   - Places INSERT policy widened to allow adds during 'gathering' OR
     'voting'. Everything else (emails, creator keys, confirmed lock) is
     unchanged.
   - `start_revote` and `finish_expired_votes` are SECURITY DEFINER (they
     must bypass the confirmed-session freeze). `start_revote` is callable
     by anyone with the session id, matching the app's no-login design;
     `finish_expired_votes` is only run by the scheduler.

6. Important notes
   - The scheduler job runs every minute via pg_cron.
*/

ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS vote_deadline_at TIMESTAMP WITH TIME ZONE;

-- Places can be added while gathering results OR while voting (custom adds)
DROP POLICY IF EXISTS "Anyone can add places" ON public.places;
CREATE POLICY "Anyone can add places" ON public.places
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id AND s.status IN ('gathering', 'voting')
    )
  );

-- Re-vote: the only sanctioned way to unlock a confirmed session
CREATE OR REPLACE FUNCTION public.start_revote(p_session_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.sessions
  SET status = 'voting',
      confirmed_place_id = NULL,
      vote_deadline_at = NULL,
      updated_at = now()
  WHERE id = p_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_revote(TEXT) TO anon, authenticated;

-- Auto-finish expired votes (run by the scheduler every minute)
CREATE OR REPLACE FUNCTION public.finish_expired_votes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s RECORD;
  top_place TEXT;
BEGIN
  FOR s IN
    SELECT id FROM public.sessions
    WHERE status = 'voting' AND vote_deadline_at IS NOT NULL AND vote_deadline_at <= now()
  LOOP
    SELECT v.place_id INTO top_place
    FROM public.votes v
    WHERE v.session_id = s.id
    GROUP BY v.place_id
    ORDER BY count(*) DESC
    LIMIT 1;

    IF top_place IS NOT NULL THEN
      UPDATE public.sessions
      SET status = 'confirmed', confirmed_place_id = top_place, updated_at = now()
      WHERE id = s.id;
    ELSE
      -- nobody voted: drop the timer and let the group try again
      UPDATE public.sessions
      SET status = 'gathering', vote_deadline_at = NULL, updated_at = now()
      WHERE id = s.id;
    END IF;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.finish_expired_votes() FROM anon, authenticated;

SELECT cron.schedule(
  'meet2eat_finish_votes',
  '* * * * *',
  'SELECT public.finish_expired_votes();'
);
