import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Disconnect Monday.com integration
 * POST /api/monday/disconnect
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🟣 [Monday Disconnect] API called');

    const session = await auth();

    if (!session?.user?.email) {
      console.error('❌ [Monday Disconnect] No session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user data
    const { data: user } = await supabase
      .from('users')
      .select('id, organization_id, role')
      .eq('email', session.user.email)
      .single();

    if (!user) {
      console.error('❌ [Monday Disconnect] User not found');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('🟣 [Monday Disconnect] User:', user.id, 'Org:', user.organization_id);

    // Find Monday.com integration (handle both 'monday' and 'monday_user' types)
    const { data: integration } = await supabase
      .from('organization_integrations')
      .select('id, configuration, integration_type')
      .eq('organization_id', user.organization_id)
      .in('integration_type', ['monday', 'monday_user'])
      .maybeSingle();

    if (!integration) {
      console.log('⚠️ [Monday Disconnect] No integration found');
      return NextResponse.json({
        ok: true,
        message: 'Monday.com was not connected'
      });
    }

    // Remove this user's tokens from configuration
    const config = integration.configuration as any || {};
    if (config[user.id]) {
      delete config[user.id];
      console.log('🟣 [Monday Disconnect] Removed user tokens from config');
    }

    // If no other users have tokens, disable the integration
    const remainingUsers = Object.keys(config).filter(key =>
      key !== 'client_id' && key !== 'client_secret'
    );

    if (remainingUsers.length === 0) {
      console.log('🟣 [Monday Disconnect] No users left, disabling integration');
      const { error: updateError } = await supabase
        .from('organization_integrations')
        .update({
          is_enabled: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', integration.id);
      
      if (updateError) {
        console.error('❌ [Monday Disconnect] Error disabling integration:', updateError);
        throw updateError;
      }
    } else {
      console.log('🟣 [Monday Disconnect] Other users still connected, updating config');
      const { error: updateError } = await supabase
        .from('organization_integrations')
        .update({
          configuration: config,
          updated_at: new Date().toISOString(),
        })
        .eq('id', integration.id);
      
      if (updateError) {
        console.error('❌ [Monday Disconnect] Error updating config:', updateError);
        throw updateError;
      }
    }

    console.log('✅ [Monday Disconnect] Disconnected successfully');

    return NextResponse.json({
      ok: true,
      message: 'Monday.com disconnected successfully'
    });
  } catch (error) {
    console.error('❌ [Monday Disconnect] Exception:', error);
    return NextResponse.json({
      error: String(error)
    }, { status: 500 });
  }
}
