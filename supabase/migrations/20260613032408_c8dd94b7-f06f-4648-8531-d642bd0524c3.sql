
-- Revoke anon execute on display_name_taken; signup flow falls back to unique-key error handling
REVOKE EXECUTE ON FUNCTION public.display_name_taken(text) FROM anon, public;

-- Restrict xp_events policies so guest (anonymous) sessions cannot read or write them
DROP POLICY IF EXISTS "Users insert own xp events" ON public.xp_events;
DROP POLICY IF EXISTS "Users view own xp events" ON public.xp_events;

CREATE POLICY "Users insert own xp events"
ON public.xp_events
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

CREATE POLICY "Users view own xp events"
ON public.xp_events
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);
