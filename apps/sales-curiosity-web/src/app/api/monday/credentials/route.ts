import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { auth } from '@/lib/auth';

/**
 * Save organization-specific Monday.com credentials
 * POST /api/monday/credentials
 */
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  
  try {
    console.log('🟣 [Monday Credentials] API called');
    
    // Get user from NextAuth session
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;

    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, organization_id, role')
      .eq('email', userEmail)
      .single();

    if (userError || !user) {
      console.error('❌ [Monday Credentials] User not found:', userError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to manage integrations
    if (!['org_admin', 'super_admin'].includes(user.role)) {
      console.error('❌ [Monday Credentials] Insufficient permissions');
      return NextResponse.json(
        { error: 'Only organization admins can configure Monday.com credentials' },
        { status: 403 }
      );
    }

    // Parse request body
    const { clientId, clientSecret } = await req.json();

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Client ID and Client Secret are required' },
        { status: 400 }
      );
    }

    console.log('🟣 [Monday Credentials] Saving credentials for org:', user.organization_id);

    // Check if org already has Monday.com integration
    const { data: existing } = await supabase
      .from('organization_integrations')
      .select('id, configuration')
      .eq('organization_id', user.organization_id)
      .eq('integration_type', 'monday')
      .maybeSingle();

    const credentials = {
      client_id: clientId,
      client_secret: clientSecret,
      credentials_saved_at: new Date().toISOString(),
      credentials_saved_by: user.id,
    };

    if (existing) {
      // Update existing record - preserve OAuth tokens if they exist
      const existingConfig = existing.configuration as any || {};
      const updatedConfig = {
        ...existingConfig,
        ...credentials,
      };

      const { error: updateError } = await supabase
        .from('organization_integrations')
        .update({
          configuration: updatedConfig,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('❌ [Monday Credentials] Update error:', updateError);
        throw updateError;
      }

      console.log('✅ [Monday Credentials] Updated existing configuration');
    } else {
      // Create new record
      const { error: insertError } = await supabase
        .from('organization_integrations')
        .insert({
          organization_id: user.organization_id,
          integration_type: 'monday',
          is_enabled: false, // Will be enabled after OAuth flow completes
          configuration: credentials,
        });

      if (insertError) {
        console.error('❌ [Monday Credentials] Insert error:', insertError);
        throw insertError;
      }

      console.log('✅ [Monday Credentials] Created new configuration');
    }

    return NextResponse.json({
      ok: true,
      message: 'Credentials saved successfully. You can now connect to Monday.com.',
    });

  } catch (error) {
    console.error('❌ [Monday Credentials] Exception:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

