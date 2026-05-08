
DROP TRIGGER IF EXISTS quiz_challenges_touch ON public.quiz_challenges;
DROP FUNCTION IF EXISTS public.touch_quiz_challenge();

CREATE OR REPLACE FUNCTION public.touch_quiz_challenge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

REVOKE EXECUTE ON FUNCTION public.touch_quiz_challenge() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER quiz_challenges_touch
  BEFORE UPDATE ON public.quiz_challenges
  FOR EACH ROW EXECUTE FUNCTION public.touch_quiz_challenge();
