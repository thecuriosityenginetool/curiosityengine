-- Migration: Update User Role Logic
-- Make all self-signups 'org_admin' by default
-- Only invited users get 'user' role

-- Update existing 'member' role users to 'org_admin' (they self-signed up)
UPDATE public.users
SET role = 'org_admin'
WHERE role = 'member'
  AND id NOT IN (
    -- Exclude users who were invited (have an invitation record)
    SELECT user_id FROM public.invitations WHERE user_id IS NOT NULL
  );

-- Update the handle_new_user() function to set org_admin for self-signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
  v_account_type TEXT;
  v_org_name TEXT;
  v_user_role TEXT;
  v_skip_org_creation BOOLEAN;
BEGIN
  v_account_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'individual');
  v_org_name := NEW.raw_user_meta_data->>'organization_name';
  v_skip_org_creation := COALESCE((NEW.raw_user_meta_data->>'skip_org_creation')::boolean, false);
  
  -- Check if this is an invited user (skip_org_creation = true means invited)
  IF v_skip_org_creation THEN
    -- This user was invited - they'll be added to existing org with 'user' role
    -- Don't create a new organization
    RETURN NEW;
  END IF;
  
  -- Self-signup: Create organization and set as org_admin
  IF v_account_type = 'organization' THEN
    INSERT INTO public.organizations (name, account_type)
    VALUES (COALESCE(v_org_name, 'My Organization'), 'organization')
    RETURNING id INTO v_org_id;
  ELSE
    -- Individual account
    INSERT INTO public.organizations (name, account_type)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email) || '''s Workspace', 'individual')
    RETURNING id INTO v_org_id;
  END IF;
  
  -- All self-signups are org_admin
  v_user_role := 'org_admin';
  
  -- Create user record
  INSERT INTO public.users (id, email, full_name, organization_id, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'full_name',
    v_org_id,
    v_user_role
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policies to handle 'user' role
-- Users with 'user' role should only see their own data and org-shared materials
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (id = auth.uid() OR organization_id IN (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  ));

COMMENT ON FUNCTION public.handle_new_user() IS 'Updated 2025-11-05: All self-signups become org_admin. Only invited users get user role.';

