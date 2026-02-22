
-- Tighten the org creation policy: only allow if user has no org yet
DROP POLICY "Authenticated users can create orgs" ON public.organizations;

CREATE POLICY "Users without org can create one" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (
    NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND organization_id IS NOT NULL)
  );
