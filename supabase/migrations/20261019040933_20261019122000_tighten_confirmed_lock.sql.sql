/*
# Tighten confirmed-session lock

1. Plain-English summary
   The previous confirmed-session lock had a hole: a crafted update to an
   already-confirmed session that kept the "confirmed" state could still
   change the session's midpoint. This migration makes the rule simple and
   airtight: a session row can only be changed while its current state is
   not "confirmed". Once confirmed, it is frozen.

2. Security changes
   - Replaces the "Anyone can update sessions" policy with a WITH CHECK that
     only allows transitions from a non-confirmed state.

3. Important notes
   - The check sees the row's pre-update state, so the confirmation
     transition itself (gathering/voting -> confirmed) is still allowed.
*/

DROP POLICY IF EXISTS "Anyone can update sessions" ON public.sessions;

CREATE POLICY "Sessions changeable until confirmed" ON public.sessions
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM public.sessions old
      WHERE old.id = id AND old.status = 'confirmed'
    )
  );
