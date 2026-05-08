
-- Quiz challenges table for realtime friend battles
CREATE TABLE public.quiz_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenger_id UUID NOT NULL,
  opponent_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'invited',
    -- invited | accepted | declined | reading | quizzing | finished | cancelled
  question_count INTEGER NOT NULL DEFAULT 5,
  topic TEXT,
  article_title TEXT,
  article_body TEXT,
  article_summary TEXT,
  questions JSONB,
  challenger_done_reading BOOLEAN NOT NULL DEFAULT false,
  opponent_done_reading BOOLEAN NOT NULL DEFAULT false,
  challenger_score INTEGER NOT NULL DEFAULT 0,
  opponent_score INTEGER NOT NULL DEFAULT 0,
  challenger_finished BOOLEAN NOT NULL DEFAULT false,
  opponent_finished BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Either party can view challenge"
  ON public.quiz_challenges FOR SELECT
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

CREATE POLICY "Challenger can create"
  ON public.quiz_challenges FOR INSERT
  WITH CHECK (auth.uid() = challenger_id);

CREATE POLICY "Either party can update"
  ON public.quiz_challenges FOR UPDATE
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

CREATE POLICY "Either party can delete"
  ON public.quiz_challenges FOR DELETE
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

CREATE OR REPLACE FUNCTION public.touch_quiz_challenge()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER quiz_challenges_touch
  BEFORE UPDATE ON public.quiz_challenges
  FOR EACH ROW EXECUTE FUNCTION public.touch_quiz_challenge();

-- Enable realtime
ALTER TABLE public.quiz_challenges REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_challenges;
