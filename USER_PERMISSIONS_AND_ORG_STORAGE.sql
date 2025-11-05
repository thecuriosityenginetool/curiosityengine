-- User Permissions and Organization Storage Migration
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/mrdqdgztzwboglkrtaui/sql
-- This adds per-user permissions and organization-based storage for sales materials

-- ===========================================
-- 1. USER PERMISSIONS TABLE
-- ===========================================

-- Define available permissions in the system
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Feature permissions
  can_view_org_materials BOOLEAN DEFAULT TRUE,
  can_upload_materials BOOLEAN DEFAULT TRUE,
  can_delete_own_materials BOOLEAN DEFAULT TRUE,
  can_delete_org_materials BOOLEAN DEFAULT FALSE,
  can_share_materials BOOLEAN DEFAULT TRUE,
  
  can_view_team_analyses BOOLEAN DEFAULT TRUE,
  can_view_team_emails BOOLEAN DEFAULT FALSE,
  
  can_manage_integrations BOOLEAN DEFAULT FALSE,
  can_invite_users BOOLEAN DEFAULT FALSE,
  can_manage_permissions BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  granted_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, organization_id)
);

-- ===========================================
-- 2. MATERIAL PERMISSIONS TABLE
-- ===========================================

-- Per-material access control
CREATE TABLE IF NOT EXISTS public.material_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID NOT NULL REFERENCES public.sales_materials(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- NULL means all org members
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Access levels
  can_view BOOLEAN DEFAULT TRUE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  can_share BOOLEAN DEFAULT FALSE,
  
  granted_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(material_id, user_id)
);

-- ===========================================
-- 3. UPDATE SALES_MATERIALS TABLE
-- ===========================================

-- Add visibility and sharing columns
ALTER TABLE public.sales_materials 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'organization')),
ADD COLUMN IF NOT EXISTS shared_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS shared_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tags TEXT[];

COMMENT ON COLUMN public.sales_materials.visibility IS 'private: only owner, team: shared with specific users, organization: all org members';
COMMENT ON COLUMN public.sales_materials.is_pinned IS 'Pinned materials appear at top for easy access';
COMMENT ON COLUMN public.sales_materials.tags IS 'Tags for organizing materials (e.g., product, industry, use-case)';

-- ===========================================
-- 4. UPDATE USER_INVITATIONS TABLE
-- ===========================================

-- Add default permissions for invited users
ALTER TABLE public.user_invitations
ADD COLUMN IF NOT EXISTS default_permissions JSONB DEFAULT '{
  "can_view_org_materials": true,
  "can_upload_materials": true,
  "can_delete_own_materials": true,
  "can_share_materials": true,
  "can_view_team_analyses": true
}'::jsonb,
ADD COLUMN IF NOT EXISTS invitation_message TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked'));

COMMENT ON COLUMN public.user_invitations.default_permissions IS 'Permissions to be granted when user accepts invitation';
COMMENT ON COLUMN public.user_invitations.invitation_message IS 'Optional message from inviter';

-- ===========================================
-- 5. CREATE INDEXES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_org_id ON public.user_permissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_material_permissions_material_id ON public.material_permissions(material_id);
CREATE INDEX IF NOT EXISTS idx_material_permissions_user_id ON public.material_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_material_permissions_org_id ON public.material_permissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_materials_visibility ON public.sales_materials(visibility);
CREATE INDEX IF NOT EXISTS idx_sales_materials_tags ON public.sales_materials USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON public.user_invitations(status);

-- ===========================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_permissions ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- 7. RLS POLICIES FOR USER_PERMISSIONS
-- ===========================================

-- Users can view their own permissions
CREATE POLICY "Users can view their own permissions"
  ON public.user_permissions FOR SELECT
  USING (auth.uid() = user_id);

-- Org admins can view all permissions in their org
CREATE POLICY "Org admins can view org permissions"
  ON public.user_permissions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users 
      WHERE id = auth.uid() AND role IN ('org_admin', 'super_admin')
    )
  );

-- Org admins can manage permissions in their org
CREATE POLICY "Org admins can manage permissions"
  ON public.user_permissions FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users 
      WHERE id = auth.uid() AND role IN ('org_admin', 'super_admin')
    )
  );

-- ===========================================
-- 8. RLS POLICIES FOR MATERIAL_PERMISSIONS
-- ===========================================

-- Users can view permissions for materials they own
CREATE POLICY "Users can view their material permissions"
  ON public.material_permissions FOR SELECT
  USING (
    material_id IN (
      SELECT id FROM public.sales_materials WHERE user_id = auth.uid()
    )
  );

-- Users with can_share_materials permission can grant access
CREATE POLICY "Users can manage their material permissions"
  ON public.material_permissions FOR ALL
  USING (
    material_id IN (
      SELECT id FROM public.sales_materials WHERE user_id = auth.uid()
    )
  );

-- Org admins can view all material permissions in their org
CREATE POLICY "Org admins can view all material permissions"
  ON public.material_permissions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users 
      WHERE id = auth.uid() AND role IN ('org_admin', 'super_admin')
    )
  );

-- ===========================================
-- 9. UPDATE RLS POLICIES FOR SALES_MATERIALS
-- ===========================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own sales materials" ON public.sales_materials;
DROP POLICY IF EXISTS "Users can create their own sales materials" ON public.sales_materials;
DROP POLICY IF EXISTS "Users can update their own sales materials" ON public.sales_materials;
DROP POLICY IF EXISTS "Users can delete their own sales materials" ON public.sales_materials;
DROP POLICY IF EXISTS "Org members can view shared sales materials" ON public.sales_materials;

-- New policies: Users can view their own materials
CREATE POLICY "Users can view their own materials"
  ON public.sales_materials FOR SELECT
  USING (user_id = auth.uid());

-- Users can view organization-wide materials in their org
CREATE POLICY "Users can view organization materials"
  ON public.sales_materials FOR SELECT
  USING (
    visibility = 'organization' AND
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Users can view team materials they have permission for
CREATE POLICY "Users can view team materials"
  ON public.sales_materials FOR SELECT
  USING (
    visibility = 'team' AND
    (
      -- Material is shared with this user specifically
      id IN (
        SELECT material_id FROM public.material_permissions 
        WHERE user_id = auth.uid() AND can_view = true
      )
      OR
      -- Material is in their org and they have general permission
      (
        organization_id IN (
          SELECT organization_id FROM public.users WHERE id = auth.uid()
        ) AND
        EXISTS (
          SELECT 1 FROM public.material_permissions 
          WHERE material_id = sales_materials.id 
          AND user_id IS NULL  -- Org-wide permission
          AND can_view = true
        )
      )
    )
  );

-- Users can insert their own materials if they have permission
CREATE POLICY "Users can create materials with permission"
  ON public.sales_materials FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    (
      -- Check if user has permission
      EXISTS (
        SELECT 1 FROM public.user_permissions 
        WHERE user_id = auth.uid() 
        AND can_upload_materials = true
      )
      OR
      -- Or if they're an org admin
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('org_admin', 'super_admin')
      )
    )
  );

-- Users can update their own materials
CREATE POLICY "Users can update their own materials"
  ON public.sales_materials FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own materials if they have permission
CREATE POLICY "Users can delete their own materials"
  ON public.sales_materials FOR DELETE
  USING (
    user_id = auth.uid() AND
    (
      EXISTS (
        SELECT 1 FROM public.user_permissions 
        WHERE user_id = auth.uid() 
        AND can_delete_own_materials = true
      )
      OR
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('org_admin', 'super_admin')
      )
    )
  );

-- Org admins can delete org materials if they have permission
CREATE POLICY "Admins can delete org materials"
  ON public.sales_materials FOR DELETE
  USING (
    organization_id IN (
      SELECT u.organization_id FROM public.users u
      JOIN public.user_permissions p ON u.id = p.user_id
      WHERE u.id = auth.uid() 
      AND u.role IN ('org_admin', 'super_admin')
      AND p.can_delete_org_materials = true
    )
  );

-- ===========================================
-- 10. HELPER FUNCTIONS
-- ===========================================

-- Function to create default permissions for new users
CREATE OR REPLACE FUNCTION public.create_default_user_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default permissions for the new user
  INSERT INTO public.user_permissions (
    user_id,
    organization_id,
    can_view_org_materials,
    can_upload_materials,
    can_delete_own_materials,
    can_share_materials,
    can_view_team_analyses,
    can_view_team_emails,
    can_manage_integrations,
    can_invite_users,
    can_manage_permissions
  ) VALUES (
    NEW.id,
    NEW.organization_id,
    true,  -- can_view_org_materials
    true,  -- can_upload_materials
    true,  -- can_delete_own_materials
    true,  -- can_share_materials
    true,  -- can_view_team_analyses
    false, -- can_view_team_emails (privacy by default)
    NEW.role IN ('org_admin', 'super_admin'), -- can_manage_integrations
    NEW.role IN ('org_admin', 'super_admin'), -- can_invite_users
    NEW.role IN ('org_admin', 'super_admin')  -- can_manage_permissions
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default permissions on user creation
DROP TRIGGER IF EXISTS on_user_created_permissions ON public.users;
CREATE TRIGGER on_user_created_permissions
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.create_default_user_permissions();

-- Function to share material with organization
CREATE OR REPLACE FUNCTION public.share_material_with_org(
  p_material_id UUID,
  p_visibility TEXT DEFAULT 'organization'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  -- Get current user and their org
  SELECT id, organization_id INTO v_user_id, v_org_id
  FROM public.users WHERE id = auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Update material visibility
  UPDATE public.sales_materials
  SET visibility = p_visibility,
      shared_by = v_user_id,
      shared_at = NOW()
  WHERE id = p_material_id
  AND user_id = v_user_id;
  
  -- If sharing with organization, create org-wide permission
  IF p_visibility = 'organization' THEN
    INSERT INTO public.material_permissions (
      material_id,
      user_id,
      organization_id,
      can_view,
      granted_by
    ) VALUES (
      p_material_id,
      NULL, -- NULL means all org members
      v_org_id,
      true,
      v_user_id
    )
    ON CONFLICT (material_id, user_id) 
    DO UPDATE SET can_view = true;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to share material with specific users
CREATE OR REPLACE FUNCTION public.share_material_with_users(
  p_material_id UUID,
  p_user_ids UUID[]
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_target_user UUID;
BEGIN
  -- Get current user and their org
  SELECT id, organization_id INTO v_user_id, v_org_id
  FROM public.users WHERE id = auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Update material visibility to team
  UPDATE public.sales_materials
  SET visibility = 'team',
      shared_by = v_user_id,
      shared_at = NOW()
  WHERE id = p_material_id
  AND user_id = v_user_id;
  
  -- Grant permissions to each user
  FOREACH v_target_user IN ARRAY p_user_ids
  LOOP
    INSERT INTO public.material_permissions (
      material_id,
      user_id,
      organization_id,
      can_view,
      granted_by
    ) VALUES (
      p_material_id,
      v_target_user,
      v_org_id,
      true,
      v_user_id
    )
    ON CONFLICT (material_id, user_id) 
    DO UPDATE SET can_view = true;
  END LOOP;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access material
CREATE OR REPLACE FUNCTION public.can_access_material(
  p_material_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_material RECORD;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get material details
  SELECT * INTO v_material
  FROM public.sales_materials
  WHERE id = p_material_id;
  
  IF v_material IS NULL THEN
    RETURN false;
  END IF;
  
  -- Owner can always access
  IF v_material.user_id = v_user_id THEN
    RETURN true;
  END IF;
  
  -- Check visibility
  IF v_material.visibility = 'private' THEN
    RETURN false;
  END IF;
  
  IF v_material.visibility = 'organization' THEN
    -- Check if user is in same org
    RETURN EXISTS (
      SELECT 1 FROM public.users
      WHERE id = v_user_id
      AND organization_id = v_material.organization_id
    );
  END IF;
  
  IF v_material.visibility = 'team' THEN
    -- Check if user has explicit permission
    RETURN EXISTS (
      SELECT 1 FROM public.material_permissions
      WHERE material_id = p_material_id
      AND (user_id = v_user_id OR user_id IS NULL)
      AND can_view = true
    );
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 11. GRANT PERMISSIONS
-- ===========================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_permissions TO authenticated;
GRANT EXECUTE ON FUNCTION public.share_material_with_org(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.share_material_with_users(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_material(UUID, UUID) TO authenticated;

-- ===========================================
-- 12. FIX USERS WITHOUT ORGANIZATIONS (IF ANY)
-- ===========================================

-- First, check if there are any users without organization_id
DO $$
DECLARE
  user_record RECORD;
  new_org_id UUID;
BEGIN
  -- Create organizations for users without one
  FOR user_record IN SELECT * FROM public.users WHERE organization_id IS NULL LOOP
    INSERT INTO public.organizations (name, account_type)
    VALUES (COALESCE(user_record.full_name, user_record.email) || '''s Workspace', 'individual')
    RETURNING id INTO new_org_id;
    
    UPDATE public.users 
    SET organization_id = new_org_id,
        role = CASE 
          WHEN role IS NULL THEN 'member'
          ELSE role 
        END
    WHERE id = user_record.id;
    
    RAISE NOTICE 'Created organization for user: %', user_record.email;
  END LOOP;
END $$;

-- ===========================================
-- 13. CREATE DEFAULT PERMISSIONS FOR EXISTING USERS
-- ===========================================

-- Create default permissions for all existing users (only those with organization_id)
INSERT INTO public.user_permissions (
  user_id,
  organization_id,
  can_view_org_materials,
  can_upload_materials,
  can_delete_own_materials,
  can_share_materials,
  can_view_team_analyses,
  can_view_team_emails,
  can_manage_integrations,
  can_invite_users,
  can_manage_permissions,
  granted_by
)
SELECT 
  u.id,
  u.organization_id,
  true,  -- can_view_org_materials
  true,  -- can_upload_materials
  true,  -- can_delete_own_materials
  true,  -- can_share_materials
  true,  -- can_view_team_analyses
  false, -- can_view_team_emails
  u.role IN ('org_admin', 'super_admin'), -- can_manage_integrations
  u.role IN ('org_admin', 'super_admin'), -- can_invite_users
  u.role IN ('org_admin', 'super_admin'), -- can_manage_permissions
  u.id   -- self-granted for existing users
FROM public.users u
WHERE u.organization_id IS NOT NULL  -- Only create permissions for users with an org
AND NOT EXISTS (
  SELECT 1 FROM public.user_permissions p 
  WHERE p.user_id = u.id AND p.organization_id = u.organization_id
);

-- ===========================================
-- 14. UPDATE STORAGE BUCKET CONFIGURATION
-- ===========================================

-- Update the sales-materials bucket to be private
UPDATE storage.buckets
SET public = false
WHERE id = 'sales-materials';

-- Drop old storage policies
DROP POLICY IF EXISTS "Users can upload their own sales materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own sales materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own sales materials" ON storage.objects;

-- New storage policies with organization support
CREATE POLICY "Users can upload materials to their org folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'sales-materials' AND
    (
      -- User uploading to their own folder
      auth.uid()::text = (storage.foldername(name))[1]
      OR
      -- User uploading to org shared folder
      (storage.foldername(name))[1] = (
        SELECT organization_id::text FROM public.users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view their accessible materials"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'sales-materials' AND
    (
      -- Own materials
      auth.uid()::text = (storage.foldername(name))[1]
      OR
      -- Org materials
      (storage.foldername(name))[1] = (
        SELECT organization_id::text FROM public.users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete their own materials"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'sales-materials' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can delete org materials"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'sales-materials' AND
    (storage.foldername(name))[1] = (
      SELECT organization_id::text FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('org_admin', 'super_admin')
    )
  );

-- ===========================================
-- 15. VERIFICATION QUERIES
-- ===========================================

-- Verify user_permissions table
SELECT 'user_permissions table created' AS status, COUNT(*) AS rows 
FROM public.user_permissions;

-- Verify material_permissions table
SELECT 'material_permissions table created' AS status, COUNT(*) AS rows 
FROM public.material_permissions;

-- Verify updated sales_materials columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sales_materials' 
AND column_name IN ('visibility', 'shared_by', 'shared_at', 'is_pinned', 'tags')
ORDER BY column_name;

-- Verify user_invitations columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_invitations' 
AND column_name IN ('default_permissions', 'invitation_message', 'status')
ORDER BY column_name;

COMMENT ON TABLE public.user_permissions IS 'Per-user feature permissions within an organization';
COMMENT ON TABLE public.material_permissions IS 'Per-material access control for sales materials';
COMMENT ON FUNCTION public.share_material_with_org IS 'Share a material with all organization members';
COMMENT ON FUNCTION public.share_material_with_users IS 'Share a material with specific users';
COMMENT ON FUNCTION public.can_access_material IS 'Check if a user can access a specific material';

