-- Fix Salesforce Connection Status Issues
-- This ensures users can see their Salesforce connections after OAuth
-- Run this in Supabase SQL Editor

-- Step 1: Check current policies on organization_integrations
SELECT 
    policyname,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'organization_integrations'
ORDER BY policyname;

-- Step 2: Drop ALL existing policies to start fresh
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'organization_integrations') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON organization_integrations', r.policyname);
    END LOOP;
END $$;

-- Step 3: Create SIMPLE, working policies

-- Service role has FULL access (required for OAuth callbacks)
CREATE POLICY "service_role_full_access"
  ON organization_integrations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can SELECT integrations for their organization
CREATE POLICY "users_can_read_own_org_integrations"
  ON organization_integrations FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Authenticated users can INSERT integrations for their organization
CREATE POLICY "users_can_create_org_integrations"
  ON organization_integrations FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Authenticated users can UPDATE integrations for their organization
CREATE POLICY "users_can_update_org_integrations"
  ON organization_integrations FOR UPDATE
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

-- Step 4: Verify the new policies
SELECT 
    policyname,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'organization_integrations'
ORDER BY policyname;

-- Expected: 4 policies
-- 1. service_role_full_access (service_role, ALL)
-- 2. users_can_read_own_org_integrations (authenticated, SELECT)
-- 3. users_can_create_org_integrations (authenticated, INSERT)  
-- 4. users_can_update_org_integrations (authenticated, UPDATE)

-- Step 5: Test - Check what integrations the current user can see
SELECT 
    integration_type,
    is_enabled,
    enabled_at,
    updated_at
FROM organization_integrations
WHERE organization_id IN (
    SELECT organization_id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
);

-- ✅ After running this, Salesforce connections should show up immediately!

