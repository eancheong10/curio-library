-- Tighten friendships UPDATE: only addressee can accept/decline; immutable participants & requester can't self-approve
DROP POLICY IF EXISTS "Either side can update friendship" ON public.friendships;

CREATE POLICY "Participants can update friendship"
ON public.friendships
FOR UPDATE
USING ((auth.uid() = requester_id) OR (auth.uid() = addressee_id))
WITH CHECK ((auth.uid() = requester_id) OR (auth.uid() = addressee_id));

CREATE OR REPLACE FUNCTION public.enforce_friendship_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Participants are immutable
  IF NEW.requester_id <> OLD.requester_id OR NEW.addressee_id <> OLD.addressee_id THEN
    RAISE EXCEPTION 'Friendship participants cannot be changed';
  END IF;

  -- Only the addressee can accept a request. Either party can decline/block/cancel.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'accepted' AND auth.uid() <> OLD.addressee_id THEN
      RAISE EXCEPTION 'Only the addressee can accept a friend request';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS friendships_update_guard ON public.friendships;
CREATE TRIGGER friendships_update_guard
BEFORE UPDATE ON public.friendships
FOR EACH ROW
EXECUTE FUNCTION public.enforce_friendship_update();


-- Tighten quiz_challenges UPDATE: each party may only modify their own score/progress fields; quiz content is immutable
DROP POLICY IF EXISTS "Either party can update" ON public.quiz_challenges;

CREATE POLICY "Participants can update quiz challenge"
ON public.quiz_challenges
FOR UPDATE
USING ((auth.uid() = challenger_id) OR (auth.uid() = opponent_id))
WITH CHECK ((auth.uid() = challenger_id) OR (auth.uid() = opponent_id));

CREATE OR REPLACE FUNCTION public.enforce_quiz_challenge_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  -- Participants and core quiz content are immutable post-creation
  IF NEW.challenger_id <> OLD.challenger_id
     OR NEW.opponent_id <> OLD.opponent_id
     OR COALESCE(NEW.questions::text,'') IS DISTINCT FROM COALESCE(OLD.questions::text,'')
     OR NEW.article_title IS DISTINCT FROM OLD.article_title
     OR NEW.article_body  IS DISTINCT FROM OLD.article_body
     OR NEW.article_summary IS DISTINCT FROM OLD.article_summary
     OR NEW.topic IS DISTINCT FROM OLD.topic
     OR NEW.question_count <> OLD.question_count
  THEN
    RAISE EXCEPTION 'Quiz content and participants cannot be modified';
  END IF;

  -- Challenger can only change their own score/finished/done_reading; opponent likewise.
  IF uid = OLD.challenger_id THEN
    IF NEW.opponent_score <> OLD.opponent_score
       OR NEW.opponent_finished <> OLD.opponent_finished
       OR NEW.opponent_done_reading <> OLD.opponent_done_reading
    THEN
      RAISE EXCEPTION 'Challenger cannot modify opponent fields';
    END IF;
  ELSIF uid = OLD.opponent_id THEN
    IF NEW.challenger_score <> OLD.challenger_score
       OR NEW.challenger_finished <> OLD.challenger_finished
       OR NEW.challenger_done_reading <> OLD.challenger_done_reading
    THEN
      RAISE EXCEPTION 'Opponent cannot modify challenger fields';
    END IF;
  ELSE
    RAISE EXCEPTION 'Only participants may update a quiz challenge';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quiz_challenges_update_guard ON public.quiz_challenges;
CREATE TRIGGER quiz_challenges_update_guard
BEFORE UPDATE ON public.quiz_challenges
FOR EACH ROW
EXECUTE FUNCTION public.enforce_quiz_challenge_update();