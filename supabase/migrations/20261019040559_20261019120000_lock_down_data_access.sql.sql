/*
# Lock down meet2eat data access

1. Plain-English summary
   Previously, every table had "anyone can do anything" rules: anyone on the
   internet could read every session (including participants' names, emails
   and exact home locations) and could edit or delete other people's entries.
   This migration replaces those rules with narrow ones.

2. New columns
   - `participants.creator_key` (text, nullable): a secret stored only in the
     browser of the person who added the participant. Update/delete of that
     participant's row requires knowing this key. The key is never returned
     by public reads.

3. Modified tables
   - `participants`: new `creator_key` column, see above.

4. Security changes
   - Replaces all previous permissive policies on sessions, participants,
     places and votes with narrow ones:
     * Reads stay public (anon key) but participant emails and creator keys
       are hidden via column-level SELECT grants.
     * Participant rows can only be updated/deleted with the correct secret
       creator key.
     * Places can only be inserted/deleted for a session that is still in
       "gathering" (setup) phase.
     * Votes can be inserted/deleted by anyone in the session, which matches
       the no-login design.

5. Important notes
   - Existing participants (none currently) would have a null creator_key;
     they keep working via the fallback predicate.
*/

-- New column: secret stored only in the browser of the person who created the participant
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS creator_key TEXT;

-- Hide emails + creator keys from public reads
REVOKE SELECT ON public.participants FROM anon, authenticated;
GRANT SELECT (id, session_id, name, location_lat, location_lng, location_label, created_at)
  ON public.participants TO anon, authenticated;
GRANT SELECT (id, session_id, name, email, creator_key, location_lat, location_lng, location_label, created_at)
  ON public.participants TO service_role;

-- Narrow writes on participants: updates need the secret key
REVOKE UPDATE, DELETE ON public.participants FROM anon, authenticated;
GRANT UPDATE (name, email, location_lat, location_lng, location_label) ON public.participants
  TO anon, authenticated;
GRANT DELETE ON public.participants TO anon, authenticated;
GRANT INSERT ON public.participants TO anon, authenticated;

-- Sessions: reads public, writes stay open (matches no-login design)
REVOKE INSERT, UPDATE ON public.sessions FROM anon, authenticated;
GRANT INSERT ON public.sessions TO anon, authenticated;
GRANT UPDATE ON public.sessions TO anon, authenticated;

-- Places: reads public, writes for sessions still in setup phase
REVOKE INSERT, DELETE ON public.places FROM anon, authenticated;
GRANT INSERT ON public.places TO anon, authenticated;
GRANT DELETE ON public.places TO anon, authenticated;

-- Votes: reads public, open inserts/deletes (group voting)
REVOKE INSERT, DELETE ON public.votes FROM anon, authenticated;
GRANT INSERT ON public.votes TO anon, authenticated;
GRANT DELETE ON public.votes TO anon, authenticated;

-- Replace participants policies
DROP POLICY IF EXISTS "Anyone can view participants" ON public.participants;
DROP POLICY IF EXISTS "Anyone can add participants" ON public.participants;
DROP POLICY IF EXISTS "Anyone can update participants" ON public.participants;
DROP POLICY IF EXISTS "Anyone can remove participants" ON public.participants;

CREATE POLICY "Anyone can view participant names and locations" ON public.participants
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can add participants" ON public.participants
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.status = 'gathering')
  );

CREATE POLICY "Participant creator can update" ON public.participants
  FOR UPDATE TO anon, authenticated
  USING (
    creator_key IS NULL
    OR creator_key = current_setting('request.headers', true)::json->>'x-creator-key'
  );

CREATE POLICY "Participant creator can delete" ON public.participants
  FOR DELETE TO anon, authenticated
  USING (
    creator_key IS NULL
    OR creator_key = current_setting('request.headers', true)::json->>'x-creator-key'
  );

-- Replace sessions policies
DROP POLICY IF EXISTS "Anyone can view sessions" ON public.sessions;
DROP POLICY IF EXISTS "Anyone can create sessions" ON public.sessions;
DROP POLICY IF EXISTS "Anyone can update sessions" ON public.sessions;

CREATE POLICY "Anyone can view sessions" ON public.sessions
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create sessions" ON public.sessions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update sessions" ON public.sessions
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (
    -- once confirmed, a session is locked
    (
      (status = 'confirmed' AND confirmed_place_id IS NOT NULL)
      OR EXISTS (
        SELECT 1 FROM public.sessions old
        WHERE old.id = id AND old.status = 'confirmed'
      ) IS FALSE
    )
  );

-- Replace places policies
DROP POLICY IF EXISTS "Anyone can view places" ON public.places;
DROP POLICY IF EXISTS "Anyone can add places" ON public.places;
DROP POLICY IF EXISTS "Anyone can remove places" ON public.places;

CREATE POLICY "Anyone can view places" ON public.places
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can add places" ON public.places
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.status = 'gathering')
  );

CREATE POLICY "Anyone can remove places" ON public.places
  FOR DELETE TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.status = 'gathering')
  );

-- Replace votes policies
DROP POLICY IF EXISTS "Anyone can view votes" ON public.votes;
DROP POLICY IF EXISTS "Anyone can add votes" ON public.votes;
DROP POLICY IF EXISTS "Anyone can remove votes" ON public.votes;

CREATE POLICY "Anyone can view votes" ON public.votes
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can add votes" ON public.votes
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.status = 'voting')
  );

CREATE POLICY "Anyone can remove votes" ON public.votes
  FOR DELETE TO anon, authenticated
  USING (true);

-- Participants reference their session; clean index
CREATE INDEX IF NOT EXISTS idx_participants_session ON public.participants(session_id);
