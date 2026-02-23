
-- Grant table permissions to authenticated role for organizations
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;

-- Also ensure org_settings has proper grants (used in Settings page)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_settings TO authenticated;
