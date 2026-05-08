-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by owner"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Favourite articles
CREATE TABLE public.favourite_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  body TEXT NOT NULL,
  topic TEXT NOT NULL,
  source_url TEXT,
  source_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.favourite_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own favourites"
  ON public.favourite_articles FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own favourites"
  ON public.favourite_articles FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own favourites"
  ON public.favourite_articles FOR DELETE
  USING (auth.uid() = user_id);

-- Favourite topics (subscribed topics shown on homepage)
CREATE TABLE public.favourite_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic)
);

ALTER TABLE public.favourite_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own topics"
  ON public.favourite_topics FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own topics"
  ON public.favourite_topics FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own topics"
  ON public.favourite_topics FOR DELETE
  USING (auth.uid() = user_id);