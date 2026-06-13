
-- Restrict profiles SELECT to own row; expose only safe public fields via a view.
DROP POLICY IF EXISTS "Profiles viewable by signed in" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Public-facing view: only non-sensitive social fields.
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT id, display_name, short_code
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated;

-- Allow the view to bypass the new restrictive SELECT policy by adding a
-- companion policy that exposes only the safe columns through the view's
-- security_invoker context. Since security_invoker uses the caller's RLS,
-- we add an additional permissive SELECT policy scoped to authenticated
-- that the view query will satisfy — but we still want to limit direct
-- table reads to own row. To achieve this, we expose data through a
-- SECURITY DEFINER function instead.
DROP VIEW IF EXISTS public.public_profiles;

CREATE OR REPLACE FUNCTION public.get_public_profiles(_ids uuid[])
RETURNS TABLE (id uuid, display_name text, short_code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.short_code
  FROM public.profiles p
  WHERE p.id = ANY(_ids);
$$;

CREATE OR REPLACE FUNCTION public.find_public_profile_by_code(_code text)
RETURNS TABLE (id uuid, display_name text, short_code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.short_code
  FROM public.profiles p
  WHERE p.short_code = upper(_code)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.search_public_profiles(_q text)
RETURNS TABLE (id uuid, display_name text, short_code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.short_code
  FROM public.profiles p
  WHERE p.display_name ILIKE '%' || _q || '%'
  LIMIT 10;
$$;

CREATE OR REPLACE FUNCTION public.display_name_taken(_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE display_name ILIKE _name);
$$;

REVOKE ALL ON FUNCTION public.get_public_profiles(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.find_public_profile_by_code(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.search_public_profiles(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.display_name_taken(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_public_profile_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_public_profiles(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.display_name_taken(text) TO authenticated, anon;
