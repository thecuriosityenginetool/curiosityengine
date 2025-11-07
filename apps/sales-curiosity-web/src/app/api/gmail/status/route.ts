import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      console.log('❌ Gmail status: No session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🟩 Checking Gmail status for:', session.user.email);

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('email', session.user.email)
      .maybeSingle();

    if (userError) {
      console.error('❌ Error fetching user:', userError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!userData) {
      console.log('❌ User not found:', session.user.email);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const organizationId = userData.organization_id || userData.id;
    console.log('🟩 User info:', { userId: userData.id, organizationId });

    // Check if Gmail integration exists and is enabled
    const { data: gmailIntegration, error: integrationError } = await supabase
      .from('organization_integrations')
      .select('is_enabled, configuration')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'gmail_user')
      .eq('is_enabled', true)
      .maybeSingle();

    if (integrationError) {
      console.error('❌ Error fetching integration:', integrationError);
      return NextResponse.json({ 
        connected: false,
        error: integrationError.message 
      }, { status: 500 });
    }

    if (!gmailIntegration) {
      console.log('❌ No Gmail integration found');
      return NextResponse.json({ 
        connected: false,
        message: 'Gmail not connected'
      });
    }

    console.log('🟩 Integration found, checking tokens...');

    // Check if user has tokens in configuration
    const config = gmailIntegration.configuration as any;
    const userTokens = config && config[userData.id];
    const hasTokens = userTokens && userTokens.access_token;

    console.log('🟩 Token check:', { 
      hasConfig: !!config, 
      hasUserInConfig: !!(config && config[userData.id]),
      hasAccessToken: !!(userTokens && userTokens.access_token),
      tokenType: typeof userTokens
    });

    if (hasTokens) {
      console.log('✅ Gmail connected');
    } else {
      console.log('❌ No tokens found for user');
    }

    return NextResponse.json({ 
      connected: !!hasTokens, // Force boolean conversion
      message: hasTokens ? 'Gmail connected' : 'Gmail integration exists but no tokens found',
      debug: {
        userId: userData.id,
        organizationId,
        hasIntegration: true,
        configKeys: config ? Object.keys(config) : [],
        tokenPresent: !!hasTokens
      }
    });
  } catch (error) {
    console.error('❌ Error checking Gmail status:', error);
    return NextResponse.json({ 
      connected: false,
      error: String(error) 
    }, { status: 500 });
  }
}

