CREATE POLICY "Anyone can remove places" ON public.places
  FOR DELETE USING (true);