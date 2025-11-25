/**
 * Helper functions for CRM integration management
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * CRM integration types
 */
export const CRM_TYPES = {
  SALESFORCE: ['salesforce', 'salesforce_user'],
  MONDAY: ['monday', 'monday_user'],
  HUBSPOT: ['hubspot', 'hubspot_user'],
} as const;

/**
 * Disconnect all other CRM integrations when connecting a new one
 * Only one CRM can be active at a time
 */
export async function disconnectOtherCRMs(
  organizationId: string,
  connectingType: 'salesforce' | 'monday' | 'hubspot'
): Promise<void> {
  console.log(`🔄 [CRM Helper] Disconnecting other CRMs for org: ${organizationId}, connecting: ${connectingType}`);

  // Determine which types to disconnect
  const typesToDisconnect: string[] = [];
  
  if (connectingType === 'salesforce') {
    typesToDisconnect.push(...CRM_TYPES.MONDAY, ...CRM_TYPES.HUBSPOT);
  } else if (connectingType === 'monday') {
    typesToDisconnect.push(...CRM_TYPES.SALESFORCE, ...CRM_TYPES.HUBSPOT);
  } else if (connectingType === 'hubspot') {
    typesToDisconnect.push(...CRM_TYPES.SALESFORCE, ...CRM_TYPES.MONDAY);
  }

  if (typesToDisconnect.length === 0) {
    console.log('⚠️ [CRM Helper] No CRMs to disconnect');
    return;
  }

  // Find all other CRM integrations
  const { data: otherIntegrations, error } = await supabase
    .from('organization_integrations')
    .select('id, integration_type, is_enabled')
    .eq('organization_id', organizationId)
    .in('integration_type', typesToDisconnect);

  if (error) {
    console.error('❌ [CRM Helper] Error finding other CRMs:', error);
    throw error;
  }

  if (!otherIntegrations || otherIntegrations.length === 0) {
    console.log('✅ [CRM Helper] No other CRMs to disconnect');
    return;
  }

  console.log(`🔄 [CRM Helper] Found ${otherIntegrations.length} other CRM(s) to disconnect`);

  // Disable all other CRM integrations
  for (const integration of otherIntegrations) {
    console.log(`🔄 [CRM Helper] Disabling ${integration.integration_type}...`);
    
    const { error: updateError } = await supabase
      .from('organization_integrations')
      .update({
        is_enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', integration.id);

    if (updateError) {
      console.error(`❌ [CRM Helper] Error disabling ${integration.integration_type}:`, updateError);
      // Continue with others even if one fails
    } else {
      console.log(`✅ [CRM Helper] Disabled ${integration.integration_type}`);
    }
  }

  console.log('✅ [CRM Helper] Finished disconnecting other CRMs');
}

