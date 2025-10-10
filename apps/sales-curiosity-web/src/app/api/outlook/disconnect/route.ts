import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { 
    status: 200, 
    headers: { 
      'Access-Control-Allow-Origin': '*', 
      'Access-Control-Allow-Methods': 'POST, OPTIONS', 
      'Access-Control-Allow-Headers': 'Authorization, Content-Type' 
    } 
  });
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    // Remove user's tokens from configuration
    const { data: existing } = await supabase
      .from('organization_integrations')
      .select('id, configuration')
      .eq('organization_id', userData.organization_id)
      .eq('integration_type', 'outlook_user')
      .single();

    if (existing) {
      const existingConfig = existing.configuration as any || {};
      delete existingConfig[user.id];

      // If no more users have tokens, disable the integration
      const hasOtherUsers = Object.keys(existingConfig).length > 0;

      if (hasOtherUsers) {
        await supabase
          .from('organization_integrations')
          .update({
            configuration: existingConfig,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('organization_integrations')
          .update({
            is_enabled: false,
            configuration: {},
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      }
    }

    return NextResponse.json({ ok: true, message: 'Outlook disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting Outlook:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

