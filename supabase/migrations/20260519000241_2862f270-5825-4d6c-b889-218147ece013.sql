
-- Library of pre-generated articles (replaces runtime AI spin)
CREATE TABLE public.library_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  topic text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  body text NOT NULL,
  emoji text NOT NULL DEFAULT '📖',
  related_topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX library_articles_topic_idx ON public.library_articles (lower(topic));
CREATE INDEX library_articles_category_idx ON public.library_articles (category);
CREATE INDEX library_articles_title_idx ON public.library_articles (lower(title));
ALTER TABLE public.library_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Library readable by signed-in"
  ON public.library_articles FOR SELECT TO authenticated USING (true);

-- Daily drops keyed by month-day so the same calendar fact appears every year
CREATE TABLE public.library_daily_drops (
  month_day text PRIMARY KEY,  -- 'MM-DD'
  title text NOT NULL,
  fact text NOT NULL,
  body text NOT NULL,
  emoji text NOT NULL DEFAULT '📜',
  topic text NOT NULL DEFAULT 'On this day'
);
ALTER TABLE public.library_daily_drops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Daily drop seeds readable by signed-in"
  ON public.library_daily_drops FOR SELECT TO authenticated USING (true);
