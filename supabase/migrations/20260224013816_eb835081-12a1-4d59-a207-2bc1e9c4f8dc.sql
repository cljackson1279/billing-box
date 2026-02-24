-- Allow admins to view all user profiles
CREATE POLICY "Admins can view all profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (public.is_admin());