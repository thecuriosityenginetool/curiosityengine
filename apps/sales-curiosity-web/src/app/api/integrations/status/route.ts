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
      integrations?.map(i => i.integration_type) || []
    );

    // Check each integration type
    const gmail = integrations?.find(i => i.integration_type === 'gmail_user' && i.is_enabled);
    const outlook = integrations?.find(i => 
      (i.integration_type === 'outlook' || i.integration_type === 'outlook_user') && i.is_enabled
    );
    const salesforce = integrations?.find(i => 
      (i.integration_type === 'salesforce' || i.integration_type === 'salesforce_user') && i.is_enabled
    );

    // Check if user has tokens in configuration
    const gmailHasTokens = gmail && gmail.configuration && (gmail.configuration as any)[userData.id]?.access_token;
    const outlookHasTokens = outlook && outlook.configuration && (outlook.configuration as any)[userData.id]?.access_token;
    const salesforceHasTokens = salesforce && salesforce.configuration && (salesforce.configuration as any)[userData.id]?.access_token;

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
      emailProvider: null
    }, { status: 500 });
  }
}

