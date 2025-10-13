-- Fix RLS policies on organization_integrations table
-- This is preventing Salesforce tokens from being saved
-- Run this in Supabase SQL Editor

-- Step 1: Check current policies
SELECT 
    policyname,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'organization_integrations';

-- Step 2: Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own organization integrations" ON organization_integrations;
DROP POLICY IF EXISTS "Users can create their own organization integrations" ON organization_integrations;
DROP POLICY IF EXISTS "Admins can manage organization integrations" ON organization_integrations;
DROP POLICY IF EXISTS "Service role has full access to integrations" ON organization_integrations;
DROP POLICY IF EXISTS "service_role_all_access" ON organization_integrations;

-- Step 3: Create SIMPLE policies that actually work

-- Service role has FULL access (needed for OAuth callbacks)
CREATE POLICY "service_role_full_access"
  ON organization_integrations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read integrations for their organization
CREATE POLICY "users_read_org_integrations"
  ON organization_integrations FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Authenticated users can create/update integrations (needed for OAuth flow)
CREATE POLICY "users_manage_org_integrations"
  ON organization_integrations FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Step 4: Verify new policies
SELECT 
    policyname,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'organization_integrations';

-- Expected: 3 policies
-- 1. service_role_full_access (service_role, ALL)
-- 2. users_read_org_integrations (authenticated, SELECT)
-- 3. users_manage_org_integrations (authenticated, ALL)

-- ✅ After this, Salesforce tokens WILL be saved!

