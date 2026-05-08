DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.profiles (id, display_name, short_code)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1))
         || '-' || substr(md5(u.id::text), 1, 4),
       public.generate_short_code()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

INSERT INTO public.user_settings (user_id)
SELECT u.id FROM auth.users u
LEFT JOIN public.user_settings s ON s.user_id = u.id
WHERE s.user_id IS NULL;