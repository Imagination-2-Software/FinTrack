-- Prevent authenticated API roles, including admins, from deleting profiles.
-- Auth-user lifecycle deletion remains a trusted Supabase Auth/service-role path.
REVOKE DELETE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT DELETE ON TABLE public.profiles TO service_role;

DROP POLICY IF EXISTS "profiles_delete_admin_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_block_authenticated_delete" ON public.profiles;

-- A restrictive false policy remains effective even if another permissive
-- authenticated DELETE policy is added later.
CREATE POLICY "profiles_block_authenticated_delete"
  ON public.profiles
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);