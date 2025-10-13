-- Comprehensive Outlook & Microsoft OAuth Setup Verification
-- Run this in Supabase SQL Editor

-- Step 1: Check if organization_integrations table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_integrations')
        THEN '✅ organization_integrations table exists'
        ELSE '❌ organization_integrations table does not exist'
    END as table_check;

-- Step 2: Check table structure
SELECT 
    'Table Structure' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'organization_integrations'
ORDER BY ordinal_position;

-- Step 3: Check if user has an organization
SELECT 
    'User Organization Check' as check_name,
    u.id as user_id,
    u.email,
    u.organization_id,
    CASE 
        WHEN u.organization_id IS NOT NULL THEN '✅ Has organization'
        ELSE '❌ Missing organization'
    END as status
FROM users u
WHERE u.email = 'matthewbravo13@gmail.com';

-- Step 4: Check existing integrations
SELECT 
    'Existing Integrations' as info,
    id,
    organization_id,
    integration_type,
    is_enabled,
    created_at,
    CASE 
        WHEN configuration IS NOT NULL THEN 'Has config'
        ELSE 'No config'
    END as config_status
FROM organization_integrations
WHERE organization_id IN (
    SELECT organization_id FROM users WHERE email = 'matthewbravo13@gmail.com'
);

-- Step 5: Create organization if missing and link user
DO $$
DECLARE
    v_user_id uuid;
    v_org_id uuid;
    v_org_exists boolean;
BEGIN
    -- Get user ID
    SELECT id, organization_id INTO v_user_id, v_org_id
    FROM users
    WHERE email = 'matthewbravo13@gmail.com';
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE '❌ User not found';
        RETURN;
    END IF;
    
    IF v_org_id IS NULL THEN
        RAISE NOTICE '⚠️  User has no organization, creating one...';
        
        -- Check if organization with user ID exists
        SELECT EXISTS(SELECT 1 FROM organizations WHERE id = v_user_id) INTO v_org_exists;
        
        IF NOT v_org_exists THEN
            -- Create organization using user ID
            INSERT INTO organizations (id, name, created_at, updated_at)
            VALUES (v_user_id, 'My Organization', NOW(), NOW());
            
            RAISE NOTICE '✅ Created organization with ID: %', v_user_id;
        END IF;
        
        -- Link user to organization
        UPDATE users SET organization_id = v_user_id WHERE id = v_user_id;
        
        RAISE NOTICE '✅ Linked user to organization';
    ELSE
        RAISE NOTICE '✅ User already has organization: %', v_org_id;
    END IF;
END $$;

-- Step 6: Verify final state
SELECT 
    '=== FINAL STATE ===' as section,
    u.id as user_id,
    u.email,
    u.organization_id,
    o.name as org_name,
    COUNT(oi.id) as integration_count
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
LEFT JOIN organization_integrations oi ON oi.organization_id = u.organization_id
WHERE u.email = 'matthewbravo13@gmail.com'
GROUP BY u.id, u.email, u.organization_id, o.name;

-- Step 7: Summary
SELECT '========================================' as summary
UNION ALL SELECT '📋 DATABASE SETUP COMPLETE'
UNION ALL SELECT '========================================'
UNION ALL SELECT ''
UNION ALL SELECT 'Next Steps:'
UNION ALL SELECT '1. If organization was created, Microsoft OAuth should now work'
UNION ALL SELECT '2. Try connecting Outlook from Dashboard → Integrations'
UNION ALL SELECT '3. Check browser console for detailed connection logs'
UNION ALL SELECT '4. Both Microsoft login AND Outlook integration should work';

