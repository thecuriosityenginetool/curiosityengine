-- ============================================
-- Verify Database Schema for Salesforce Integration
-- ============================================
-- Run this in Supabase SQL Editor

-- 1. Check if organization_integrations table exists
SELECT 
  'organization_integrations table' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'organization_integrations'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING - Need to run schema migration!'
  END as status;

-- 2. Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'organization_integrations'
ORDER BY ordinal_position;

-- 3. Check if configuration column is JSONB (required for storing credentials)
SELECT 
  'configuration column type' as check_name,
  CASE 
    WHEN data_type = 'jsonb' THEN '✅ JSONB - Correct'
    WHEN data_type = 'json' THEN '⚠️ JSON - Should be JSONB'
    ELSE '❌ Wrong type: ' || data_type
  END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'organization_integrations'
  AND column_name = 'configuration';

-- 4. Check constraint for integration_type includes 'salesforce'
SELECT 
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%organization_integrations%integration_type%';

-- 5. Check if any Salesforce integrations exist
SELECT 
  'Salesforce integrations count' as check_name,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Found ' || COUNT(*) || ' integration(s)'
    ELSE '⚠️ No integrations yet (normal for first setup)'
  END as status
FROM organization_integrations
WHERE integration_type IN ('salesforce', 'salesforce_user');

-- 6. Check your specific organization's Salesforce config (if exists)
SELECT 
  id,
  organization_id,
  integration_type,
  is_enabled,
  configuration->>'client_id' as has_client_id,
  CASE 
    WHEN configuration->>'client_secret' IS NOT NULL THEN '✅ Secret saved'
    ELSE '❌ No secret'
  END as has_client_secret,
  configuration->>'access_token' as has_access_token,
  configuration->>'credentials_saved_at' as saved_at,
  enabled_at,
  created_at
FROM organization_integrations
WHERE integration_type = 'salesforce'
ORDER BY created_at DESC
LIMIT 5;

-- 7. Check if users table exists
SELECT 
  'users table' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- 8. Check if organizations table exists
SELECT 
  'organizations table' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'organizations'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- Summary
SELECT '=== SUMMARY ===' as info;
SELECT 'If all tables exist and configuration is JSONB, schema is ready!' as result;
SELECT 'If tables are missing, you need to run the schema migration SQL files' as action;

