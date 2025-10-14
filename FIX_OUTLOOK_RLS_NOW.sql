-- 🚨 FIX OUTLOOK CONNECTION - RLS Policy Fix
-- This ensures the OAuth callback can save tokens
-- Run this in Supabase SQL Editor

-- ========================================
-- STEP 1: Check current RLS status
-- ========================================
SELECT 
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'organization_integrations';

-- Should show: rowsecurity = true

-- ========================================
-- STEP 2: Check current policies
-- ========================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'organization_integrations'
ORDER BY policyname;

-- ========================================
-- STEP 3: Drop ALL existing policies
-- ========================================
-- (This ensures clean slate)

DROP POLICY IF EXISTS "Users can view their own organization integrations" ON organization_integrations;
DROP POLICY IF EXISTS "Users can create their own organization integrations" ON organization_integrations;
DROP POLICY IF EXISTS "Admins can manage organization integrations" ON organization_integrations;
DROP POLICY IF EXISTS "Service role has full access to integrations" ON organization_integrations;
DROP POLICY IF EXISTS "service_role_all_access" ON organization_integrations;
DROP POLICY IF EXISTS "service_role_full_access" ON organization_integrations;
DROP POLICY IF EXISTS "users_read_org_integrations" ON organization_integrations;
DROP POLICY IF EXISTS "users_manage_org_integrations" ON organization_integrations;

-- ========================================
-- STEP 4: Create NEW policies (FIXED)
-- ========================================

-- 🔑 CRITICAL: Service role has FULL access
-- This allows OAuth callbacks to save tokens
CREATE POLICY "service_role_full_access"
  ON organization_integrations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 👤 Authenticated users can read their org's integrations
CREATE POLICY "users_read_org_integrations"
  ON organization_integrations FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT COALESCE(organization_id, id) FROM users WHERE id = auth.uid()
    )
    OR organization_id = auth.uid()  -- Allow if org_id matches user_id
  );

-- ✏️ Authenticated users can insert/update their org's integrations
CREATE POLICY "users_write_org_integrations"
  ON organization_integrations FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT COALESCE(organization_id, id) FROM users WHERE id = auth.uid()
    )
    OR organization_id = auth.uid()  -- Allow if org_id matches user_id
  );

CREATE POLICY "users_update_org_integrations"
  ON organization_integrations FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT COALESCE(organization_id, id) FROM users WHERE id = auth.uid()
    )
    OR organization_id = auth.uid()
  )
  WITH CHECK (
    organization_id IN (
      SELECT COALESCE(organization_id, id) FROM users WHERE id = auth.uid()
    )
    OR organization_id = auth.uid()
  );

-- ========================================
-- STEP 5: Verify new policies
-- ========================================
SELECT 
    policyname,
    roles,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'organization_integrations'
ORDER BY policyname;

-- Expected results:
-- 1. service_role_full_access     | {service_role}  | *   | PERMISSIVE
-- 2. users_read_org_integrations  | {authenticated} | r   | PERMISSIVE
-- 3. users_write_org_integrations | {authenticated} | a   | PERMISSIVE
-- 4. users_update_org_integrations| {authenticated} | w   | PERMISSIVE

-- ========================================
-- STEP 6: Test the fix
-- ========================================

-- Check if you have any existing Outlook integrations
SELECT 
    id,
    organization_id,
    integration_type,
    is_enabled,
    jsonb_object_keys(configuration) as user_ids_in_config,
    created_at,
    updated_at
FROM organization_integrations
WHERE integration_type = 'outlook_user'
ORDER BY created_at DESC;

-- If you see records but they're missing your user ID in config,
-- that's why it shows "Not Connected"

-- ========================================
-- 🎯 AFTER RUNNING THIS
-- ========================================
-- 1. Go back to your web app
-- 2. Try connecting Outlook again
-- 3. Check Vercel logs for:
--    ✅ Integration created successfully
--    OR
--    ✅ Integration updated successfully
-- 4. Should work now! 🎉

RAISE NOTICE '✅ RLS policies fixed for organization_integrations';
RAISE NOTICE '🔄 Now try connecting Outlook again in your web app';

