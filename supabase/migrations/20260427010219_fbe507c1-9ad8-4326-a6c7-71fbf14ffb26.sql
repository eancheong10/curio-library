
-- Extend profiles with stats
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS articles_read INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seconds_read INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS top_topic TEXT;

-- XP events log
CREATE TABLE IF NOT EXISTS public.xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  topic TEXT NOT NULL,
  xp INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT 'read',
  article_title TEXT,
  seconds_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own xp events" ON public.xp_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own xp events" ON public.xp_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_xp_events_user ON public.xp_events(user_id, created_at DESC);

-- Topic connections (for curiosity map)
CREATE TABLE IF NOT EXISTS public.topic_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  from_topic TEXT NOT NULL,
  to_topic TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, from_topic, to_topic)
);
ALTER TABLE public.topic_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own connections" ON public.topic_connections
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own connections" ON public.topic_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own connections" ON public.topic_connections
  FOR UPDATE USING (auth.uid() = user_id);

-- Daily curiosity drops (shared content; one row per date)
CREATE TABLE IF NOT EXISTS public.daily_drops (
  drop_date DATE PRIMARY KEY,
  title TEXT NOT NULL,
  fact TEXT NOT NULL,
  body TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '📜',
  topic TEXT NOT NULL DEFAULT 'On this day',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_drops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read daily drops" ON public.daily_drops
  FOR SELECT TO authenticated USING (true);
-- Edge functions (service role) bypass RLS so no insert policy needed for clients.
