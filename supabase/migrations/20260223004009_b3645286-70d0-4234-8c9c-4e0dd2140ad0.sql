
-- Drop the restrictive insert policy and recreate as permissive
DROP POLICY IF EXISTS "Users without org can create one" ON public.organizations;

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

-- The ALL policy is restrictive which blocks inserts. 
-- Change it to only cover SELECT/UPDATE/DELETE so it doesn't conflict with INSERT.
DROP POLICY IF EXISTS "Org members can manage own org" ON public.organizations;

CREATE POLICY "Org members can manage own org"
ON public.organizations
FOR ALL
TO authenticated
USING (id = get_user_org_id());
