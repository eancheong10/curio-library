ALTER TABLE public.quiz_challenges
ADD COLUMN IF NOT EXISTS reading_started_at TIMESTAMP WITH TIME ZONE;