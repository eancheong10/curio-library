-- 1. user_settings
CREATE TABLE public.user_settings (
  user_id UUID NOT NULL PRIMARY KEY,
  theme TEXT NOT NULL DEFAULT 'library',
  font_size TEXT NOT NULL DEFAULT 'medium',
  country TEXT NOT NULL DEFAULT 'global',
  onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);

-- 2. user_interests
CREATE TABLE public.user_interests (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  interest TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, interest)
);
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own interests" ON public.user_interests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own interests" ON public.user_interests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own interests" ON public.user_interests FOR DELETE USING (auth.uid() = user_id);

-- 3. read_history
CREATE TABLE public.read_history (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  topic TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  body TEXT,
  source_kind TEXT NOT NULL DEFAULT 'spin',  -- 'spin' | 'news' | 'daily'
  source_url TEXT,
  source_name TEXT,
  emoji TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.read_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own history" ON public.read_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own history" ON public.read_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own history" ON public.read_history FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_read_history_user_topic ON public.read_history (user_id, topic);
CREATE INDEX idx_read_history_user_created ON public.read_history (user_id, created_at DESC);

-- 4. article_comments
CREATE TABLE public.article_comments (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  article_key TEXT NOT NULL,             -- stable key, e.g. 'news:<id>' or 'spin:<title-slug>'
  display_name TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.article_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed-in can read comments" ON public.article_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own comments" ON public.article_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own comments" ON public.article_comments FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_article_comments_key ON public.article_comments (article_key, created_at DESC);

-- 5. friendships
CREATE TABLE public.friendships (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL,
  addressee_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'accepted'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own friendships" ON public.friendships FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Users create friend requests" ON public.friendships FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Either side can update friendship" ON public.friendships FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Either side can delete friendship" ON public.friendships FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);