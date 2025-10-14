import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { auth } from '@/lib/auth';

/**
 * Debug endpoint to check Salesforce connection status
 * GET /api/debug/salesforce
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user data
    const { data: userData } = await supabase
      .from('users')
      .select('id, organization_id, email')
      .eq('email', session.user.email)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id: userId, organization_id: organizationId } = userData;

    // Check Salesforce connection
    const { data: existingConnection } = await supabase
      .from('organization_integrations')
      .select('id, is_enabled, configuration, integration_type')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'salesforce_user')
      .eq('is_enabled', true)
      .maybeSingle();

    return NextResponse.json({
      userId,
      organizationId,
      hasConnection: !!existingConnection,
      connection: existingConnection,
      configType: typeof existingConnection?.configuration,
      configKeys: existingConnection?.configuration ? Object.keys(existingConnection.configuration) : [],
      userTokens: existingConnection?.configuration ? existingConnection.configuration[userId] : null,
      hasUserTokens: !!(existingConnection?.configuration && existingConnection.configuration[userId]),
      hasAccessToken: !!(existingConnection?.configuration && existingConnection.configuration[userId]?.access_token)
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
