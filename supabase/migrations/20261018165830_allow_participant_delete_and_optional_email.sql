-- Fix: participants could never be removed because no DELETE policy existed
CREATE POLICY "Anyone can remove participants" ON public.participants
  FOR DELETE USING (true);

-- Fix: email is now optional in the app; column must accept empty value
ALTER TABLE public.participants ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.participants ALTER COLUMN email SET DEFAULT '';