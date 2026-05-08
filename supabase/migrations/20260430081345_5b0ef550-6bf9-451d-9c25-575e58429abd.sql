ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS short_code text;

CREATE OR REPLACE FUNCTION public.generate_short_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

UPDATE public.profiles SET short_code = public.generate_short_code() WHERE short_code IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN short_code SET DEFAULT public.generate_short_code(),
  ALTER COLUMN short_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_short_code_key ON public.profiles(short_code);

DROP POLICY IF EXISTS "Profiles are viewable by owner" ON public.profiles;
CREATE POLICY "Profiles viewable by signed in"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, short_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    public.generate_short_code()
  );
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE IF NOT EXISTS public.bookshelves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  emoji text DEFAULT '📚',
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bookshelves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own shelves" ON public.bookshelves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own shelves" ON public.bookshelves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own shelves" ON public.bookshelves FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own shelves" ON public.bookshelves FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.favourite_articles
  ADD COLUMN IF NOT EXISTS bookshelf_id uuid REFERENCES public.bookshelves(id) ON DELETE SET NULL;

ALTER TABLE public.article_comments
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.article_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS article_comments_parent_idx ON public.article_comments(parent_id);
CREATE INDEX IF NOT EXISTS article_comments_article_idx ON public.article_comments(article_key);