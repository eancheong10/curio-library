
CREATE POLICY "Users update own favourites"
  ON public.favourite_articles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
