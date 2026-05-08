ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS highest_streak integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_read_date date;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_current_streak_nonnegative CHECK (current_streak >= 0),
ADD CONSTRAINT profiles_highest_streak_nonnegative CHECK (highest_streak >= 0);

CREATE INDEX IF NOT EXISTS idx_profiles_last_read_date ON public.profiles(last_read_date);