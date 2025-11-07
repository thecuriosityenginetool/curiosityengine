import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    console.log('🟩 [Gmail Disconnect] Starting disconnect...');
    
    const session = await auth();
    if (!session?.user?.email) {
      console.error('❌ [Gmail Disconnect] No session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🟩 [Gmail Disconnect] User:', session.user.email);

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('email', session.user.email)
      .maybeSingle();

    if (!userData) {
      console.error('❌ [Gmail Disconnect] User not found');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const organizationId = userData.organization_id || userData.id;
    console.log('🟩 [Gmail Disconnect] Organization:', organizationId);

    // Remove user's tokens from configuration
    const { data: existing } = await supabase
      .from('organization_integrations')
      .select('id, configuration')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'gmail_user')
      .maybeSingle();

    if (existing) {
      console.log('🟩 [Gmail Disconnect] Found integration, removing user tokens...');
      const existingConfig = existing.configuration as any || {};
      delete existingConfig[userData.id];

      // If no more users have tokens, disable the integration
      const hasOtherUsers = Object.keys(existingConfig).length > 0;

      console.log('🟩 [Gmail Disconnect] Other users:', hasOtherUsers);

      if (hasOtherUsers) {
        await supabase
          .from('organization_integrations')
          .update({
            configuration: existingConfig,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        console.log('✅ [Gmail Disconnect] Updated configuration (other users remain)');
      } else {
        await supabase
          .from('organization_integrations')
          .update({
            is_enabled: false,
            configuration: {},
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        console.log('✅ [Gmail Disconnect] Disabled integration (no other users)');
      }
    } else {
      console.log('⚠️ [Gmail Disconnect] No integration found to disconnect');
    }

    console.log('✅ [Gmail Disconnect] Disconnect complete');
    return NextResponse.json({ ok: true, message: 'Gmail disconnected successfully' });
  } catch (error) {
    console.error('❌ [Gmail Disconnect] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

