/*
# Fix confirmed-lock correlation bug

1. Plain-English summary
   The previous confirmed-lock check had a SQL bug: inside the subquery,
   `old.id = id` was resolved as `old.id = old.id` (always true), which made
   the check freeze every session once any single session was confirmed.
   This migration qualifies the outer table explicitly so the comparison is
   between the subquery's row and the row being updated.

2. Security changes
   - Replaces the "Sessions changeable until confirmed" policy with a
     correctly correlated version: a row can only be updated while that
     specific row's current state is not "confirmed".

3. Important notes
   - `sessions.id` on the right-hand side refers to the row being updated;
     `old.id` refers to the subquery's snapshot of the same row.
*/

DROP POLICY IF EXISTS "Sessions changeable until confirmed" ON public.sessions;

CREATE POLICY "Sessions changeable until confirmed" ON public.sessions
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM public.sessions old
      WHERE old.id = sessions.id AND old.status = 'confirmed'
    )
  );
