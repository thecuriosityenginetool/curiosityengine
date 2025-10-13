-- Very simple Salesforce connection check
SELECT * FROM organization_integrations 
WHERE integration_type = 'salesforce_user';

-- If you see a row:
-- ✅ Connection is saved!
-- Check: is_enabled = true
-- Check: configuration has data

-- If you see NO rows:
-- ❌ Connection didn't save
-- Try connecting again

