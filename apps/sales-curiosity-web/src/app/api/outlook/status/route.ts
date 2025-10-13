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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user data
    const { data: userData } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('email', session.user.email)
      .maybeSingle();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const organizationId = userData.organization_id || userData.id;

    // Check if Outlook integration exists and is enabled
    const { data: outlookIntegration } = await supabase
      .from('organization_integrations')
      .select('is_enabled, configuration')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'outlook_user')
      .eq('is_enabled', true)
      .maybeSingle();

    if (!outlookIntegration) {
      return NextResponse.json({ 
        connected: false,
        message: 'Outlook not connected'
      });
    }

    // Check if user has tokens in configuration
    const config = outlookIntegration.configuration as any;
    const hasTokens = config && config[userData.id] && config[userData.id].access_token;

    return NextResponse.json({ 
      connected: hasTokens,
      message: hasTokens ? 'Outlook connected' : 'Outlook integration exists but no tokens found'
    });
  } catch (error) {
    console.error('Error checking Outlook status:', error);
    return NextResponse.json({ 
      connected: false,
      error: String(error) 
    }, { status: 500 });
  }
}

