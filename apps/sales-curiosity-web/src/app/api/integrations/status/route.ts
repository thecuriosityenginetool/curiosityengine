import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Comprehensive integration status check
 * Returns status for ALL integrations: Gmail, Outlook, Salesforce
 */
export async function GET(req: NextRequest) {
  try {
    console.log('🔍 [Integration Status] API called');
    const session = await auth();
    
    if (!session?.user?.email) {
      console.error('❌ [Integration Status] No session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 [Integration Status] Checking for user:', session.user.email);

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, organization_id, role')
      .eq('email', session.user.email)
      .maybeSingle();

    if (userError) {
      console.error('❌ [Integration Status] User fetch error:', userError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!userData) {
      console.error('❌ [Integration Status] User not found:', session.user.email);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const organizationId = userData.organization_id || userData.id;
    console.log('🔍 [Integration Status] User info:', { 
      userId: userData.id, 
      organizationId,
      role: userData.role 
    });

    // Fetch ALL integrations for this organization
    const { data: integrations, error: integrationsError } = await supabase
      .from('organization_integrations')
      .select('integration_type, is_enabled, configuration, updated_at')
      .eq('organization_id', organizationId);

    if (integrationsError) {
      console.error('❌ [Integration Status] Error fetching integrations:', integrationsError);
      return NextResponse.json({ error: 'Failed to fetch integrations' }, { status: 500 });
    }

    console.log('🔍 [Integration Status] Found integrations:', 
      integrations?.map(i => ({ type: i.integration_type, enabled: i.is_enabled })) || []
    );

    // Check each integration type - include disabled ones for debugging
    const gmail = integrations?.find(i => i.integration_type === 'gmail_user');
    const outlook = integrations?.find(i => 
      (i.integration_type === 'outlook' || i.integration_type === 'outlook_user')
    );
    const salesforce = integrations?.find(i => 
      (i.integration_type === 'salesforce' || i.integration_type === 'salesforce_user')
    );
    const monday = integrations?.find(i => 
      (i.integration_type === 'monday' || i.integration_type === 'monday_user')
    );
    
    console.log('🔍 [Integration Status] Raw integration data:', {
      gmail: gmail ? { type: gmail.integration_type, enabled: gmail.is_enabled, hasConfig: !!gmail.configuration } : null,
      outlook: outlook ? { type: outlook.integration_type, enabled: outlook.is_enabled, hasConfig: !!outlook.configuration } : null,
      salesforce: salesforce ? { type: salesforce.integration_type, enabled: salesforce.is_enabled, hasConfig: !!salesforce.configuration } : null,
      monday: monday ? { type: monday.integration_type, enabled: monday.is_enabled, hasConfig: !!monday.configuration } : null,
    });

    // Check if user has tokens in configuration
    // Handle both user-level tokens (configuration[userId]) and org-level tokens (configuration.access_token)
    const gmailConfig = gmail?.configuration as any;
    const gmailHasTokens = gmail && gmailConfig && (
      gmailConfig[userData.id]?.access_token || // User-level
      gmailConfig.access_token // Org-level
    );
    
    const outlookConfig = outlook?.configuration as any;
    const outlookHasTokens = outlook && outlookConfig && (
      outlookConfig[userData.id]?.access_token || // User-level
      outlookConfig.access_token // Org-level
    );
    
    const salesforceConfig = salesforce?.configuration as any;
    const salesforceHasTokens = salesforce && salesforceConfig && (
      salesforceConfig[userData.id]?.access_token || // User-level
      salesforceConfig.access_token // Org-level
    );
    
    const mondayConfig = monday?.configuration as any;
    const mondayHasTokens = monday && mondayConfig && (
      mondayConfig[userData.id]?.access_token || // User-level
      mondayConfig.access_token // Org-level
    );
    
    console.log('🔍 [Integration Status] Token check:', {
      salesforceIntegrationType: salesforce?.integration_type,
      salesforceEnabled: salesforce?.is_enabled,
      salesforceHasConfig: !!salesforceConfig,
      salesforceHasOrgTokens: !!salesforceConfig?.access_token,
      salesforceHasUserTokens: !!salesforceConfig?.[userData.id]?.access_token,
      salesforceConfigKeys: salesforceConfig ? Object.keys(salesforceConfig).slice(0, 5) : [],
      mondayEnabled: monday?.is_enabled,
      mondayHasTokens: !!mondayHasTokens
    });

    const status = {
      gmail: {
        connected: !!gmailHasTokens,
        enabled: !!gmail,
        hasUserTokens: !!gmailHasTokens,
        lastUpdated: gmail?.updated_at || null
      },
      outlook: {
        connected: !!outlookHasTokens,
        enabled: !!outlook,
        hasUserTokens: !!outlookHasTokens,
        lastUpdated: outlook?.updated_at || null
      },
      salesforce: {
        connected: !!salesforceHasTokens,
        enabled: !!salesforce,
        hasUserTokens: !!salesforceHasTokens,
        lastUpdated: salesforce?.updated_at || null
      },
      monday: {
        connected: !!mondayHasTokens,
        enabled: !!monday,
        hasUserTokens: !!mondayHasTokens,
        lastUpdated: monday?.updated_at || null
      },
      emailProvider: gmailHasTokens ? 'google' : outlookHasTokens ? 'microsoft' : null
    };

    console.log('✅ [Integration Status] Status:', status);

    return NextResponse.json(status);
  } catch (error) {
    console.error('❌ [Integration Status] Fatal error:', error);
    return NextResponse.json({ 
      error: String(error),
      gmail: { connected: false },
      outlook: { connected: false },
      salesforce: { connected: false },
      monday: { connected: false },
      emailProvider: null
    }, { status: 500 });
  }
}

