-- Prevent an authenticated administrator from removing their own admin role
-- or deactivating their own account through direct Supabase API updates.
-- Service-role administrative operations remain trusted server-side actions.
CREATE OR REPLACE FUNCTION public.enforce_profile_update_security()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_service_role BOOLEAN;
  v_is_admin_user BOOLEAN;
BEGIN
  -- Profile email may change only when it matches the Auth user record.
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    IF NOT EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = NEW.id AND email = NEW.email
    ) THEN
      RAISE EXCEPTION 'Access denied: Profile email can only be updated through the verified Supabase Auth workflow.';
    END IF;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Immutable field: Profile ID cannot be modified.';
  END IF;

  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Immutable field: Profile creation timestamp cannot be modified.';
  END IF;

  v_is_service_role := (COALESCE(auth.jwt() ->> 'role', '') = 'service_role');
  v_is_admin_user := public.is_admin();

  -- Preserve the one-time bootstrap path used by trusted SQL Editor/service
  -- operations. The marker alone is insufficient: this must be the first
  -- active, confirmed user being promoted, with other profile fields unchanged.
  IF current_setting('fintrack.bootstrap_first_admin', true) = 'active'
    AND (v_is_service_role OR session_user = 'postgres')
    AND OLD.role = 'user'
    AND NEW.role = 'admin'
    AND OLD.is_active IS TRUE
    AND NEW.is_active IS TRUE
    AND NEW.full_name IS NOT DISTINCT FROM OLD.full_name
    AND NEW.avatar_url IS NOT DISTINCT FROM OLD.avatar_url
    AND NEW.display_currency IS NOT DISTINCT FROM OLD.display_currency
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = NEW.id
        AND email_confirmed_at IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE role = 'admin'
    )
  THEN
    RETURN NEW;
  END IF;

  -- Preserve trusted database-owner and service-role operations. The universal
  -- email and immutable-column checks above continue to apply to these paths.
  IF v_is_service_role OR session_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  IF v_is_admin_user THEN
    IF NEW.id = auth.uid()
      AND (
        NEW.role IS DISTINCT FROM OLD.role
        OR NEW.is_active IS DISTINCT FROM OLD.is_active
      )
    THEN
      RAISE EXCEPTION 'Access denied: Administrators cannot change their own role or account status.'
        USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Access denied: Users cannot modify their own role. Administrative privileges required.';
  END IF;

  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'Access denied: Users cannot modify their active account status. Administrative privileges required.';
  END IF;

  RETURN NEW;
END;
$$;

-- Preserve administrator deletion of other profiles, but do not let an
-- authenticated administrator delete their own profile through the API.
DROP POLICY IF EXISTS "profiles_delete_admin_only" ON public.profiles;
CREATE POLICY "profiles_delete_admin_only"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (public.is_admin() AND auth.uid() IS DISTINCT FROM id);

-- Restrictive policies are ANDed with permissive policies, so an additional
-- permissive DELETE policy cannot re-enable authenticated self-deletion.
DROP POLICY IF EXISTS "profiles_prevent_self_delete" ON public.profiles;
CREATE POLICY "profiles_prevent_self_delete"
  ON public.profiles
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS DISTINCT FROM id);