CREATE UNIQUE INDEX IF NOT EXISTS profiles_display_name_unique_ci
ON public.profiles (lower(btrim(display_name)))
WHERE display_name IS NOT NULL AND btrim(display_name) <> '';