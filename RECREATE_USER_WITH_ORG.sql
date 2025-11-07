-- Recreate user with organization (to satisfy user_permissions constraint)
-- Run this in Supabase SQL Editor

-- Step 1: Create organization
INSERT INTO organizations (
  id,
  name,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Matthew Bravo Org',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING
RETURNING id;

-- Step 2: Get the organization ID (or create if doesn't exist)
-- Store this in a variable for the next step
DO $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
BEGIN
  -- Get or create organization
  INSERT INTO organizations (name, created_at, updated_at)
  VALUES ('Matthew Bravo Org', NOW(), NOW())
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_org_id;
  
  -- If no ID returned (conflict), get existing
  IF v_org_id IS NULL THEN
    SELECT id INTO v_org_id FROM organizations 
    WHERE name = 'Matthew Bravo Org' LIMIT 1;
  END IF;

  -- Delete existing user if any
  DELETE FROM users WHERE email = 'matthewbravo13@gmail.com';

  -- Create user with organization
  INSERT INTO users (
    id,
    email,
    full_name,
    role,
    email_provider,
    organization_id,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    'matthewbravo13@gmail.com',
    'Matthew Bravo',
    'org_admin',
    'google',
    v_org_id,
    NOW(),
    NOW()
  );

  RAISE NOTICE 'User created successfully with org_id: %', v_org_id;
END $$;

-- Verify
SELECT 'User recreated successfully!' as status;
SELECT id, email, full_name, organization_id, role, email_provider
FROM users 
WHERE email = 'matthewbravo13@gmail.com';

