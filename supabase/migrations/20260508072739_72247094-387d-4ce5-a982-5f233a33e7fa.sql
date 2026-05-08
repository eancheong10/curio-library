REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_short_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_quiz_challenge() FROM PUBLIC, anon, authenticated;