
-- Drop existing policies on organizations
DROP POLICY IF EXISTS "Org members can manage own org" ON public.organizations;
DROP POLICY IF EXISTS "Users without org can create one" ON public.organizations;

-- SELECT: only see your own org
CREATE POLICY "Org members can select own org"
ON public.organizations
FOR SELECT
TO authenticated
USING (id = get_user_org_id());

-- UPDATE: only update your own org
CREATE POLICY "Org members can update own org"
ON public.organizations
FOR UPDATE
TO authenticated
USING (id = get_user_org_id())
WITH CHECK (id = get_user_org_id());

-- DELETE: only delete your own org
CREATE POLICY "Org members can delete own org"
ON public.organizations
FOR DELETE
TO authenticated
USING (id = get_user_org_id());

-- INSERT: only if user has no org yet
CREATE POLICY "Users without org can create one"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.organization_id IS NOT NULL
  )
);
