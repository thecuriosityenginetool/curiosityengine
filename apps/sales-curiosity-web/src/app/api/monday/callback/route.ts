import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/monday';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Monday.com OAuth callback for organization-level connections
 * GET /api/monday/callback?code=xxx&state=xxx
 */
export async function GET(req: NextRequest) {
  try {
    console.log('🟣 [Monday Callback-Org] OAuth callback received');
    
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for OAuth errors
    if (error) {
      const errorDescription = searchParams.get('error_description');
      console.error('❌ [Monday Callback-Org] OAuth error:', error, errorDescription);
      
      return NextResponse.redirect(
        new URL(
          `/dashboard?tab=integrations&error=${encodeURIComponent(errorDescription || error)}`,
          process.env.NEXT_PUBLIC_APP_URL
        )
      );
    }

    if (!code || !state) {
      console.error('❌ [Monday Callback-Org] Missing code or state');
      return NextResponse.redirect(
        new URL(
          '/dashboard?tab=integrations&error=Invalid OAuth callback',
          process.env.NEXT_PUBLIC_APP_URL
        )
      );
    }

    // Decode state
    let stateData;
    try {
      stateData = JSON.parse(
        Buffer.from(state, 'base64url').toString('utf-8')
      );
      console.log('🟣 [Monday Callback-Org] Decoded state:', { 
        organizationId: stateData.organizationId,
        userId: stateData.userId, 
        type: stateData.type 
      });
    } catch (e) {
      console.error('❌ [Monday Callback-Org] Invalid state parameter:', e);
      return NextResponse.redirect(
        new URL(
          '/dashboard?tab=integrations&error=Invalid state parameter',
          process.env.NEXT_PUBLIC_APP_URL
        )
      );
    }

    const { organizationId, userId, type } = stateData;

    // Validate this is org-level callback
    if (!organizationId || !userId) {
      console.error('❌ [Monday Callback-Org] Missing required state data');
      return NextResponse.redirect(
        new URL(
          '/dashboard?tab=integrations&error=Invalid callback data',
          process.env.NEXT_PUBLIC_APP_URL
        )
      );
    }
    
    // If type is explicitly set, verify it's 'org'
    if (type && type !== 'org') {
      console.error('❌ [Monday Callback-Org] Wrong callback type:', type);
      return NextResponse.redirect(
        new URL(
          '/dashboard?tab=integrations&error=Invalid callback - wrong connection type',
          process.env.NEXT_PUBLIC_APP_URL
        )
      );
    }
    
    console.log('✅ [Monday Callback-Org] Valid org-level callback');

    // Exchange code for tokens
    const orgCallbackUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/monday/callback`;
    console.log('🟣 [Monday Callback-Org] Exchanging code for tokens...');
    const tokens = await exchangeCodeForTokens(code, orgCallbackUri);
    console.log('✅ [Monday Callback-Org] Tokens received');

    // Get or create integration record
    const { data: existing } = await supabase
      .from('organization_integrations')
      .select('id, configuration')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'monday')
      .maybeSingle();

    console.log('🟣 [Monday Callback-Org] Existing connection:', existing ? 'Found' : 'Not found');

    // Merge OAuth tokens with existing configuration (preserve credentials if any)
    const existingConfig = existing?.configuration as any || {};
    const updatedConfig = {
      ...existingConfig,
      ...tokens,
      connected_at: new Date().toISOString(),
      connected_by: userId,
    };

    if (existing) {
      // Update existing integration
      console.log('🟣 [Monday Callback-Org] Updating existing integration');
      const { error: updateError } = await supabase
        .from('organization_integrations')
        .update({
          is_enabled: true,
          configuration: updatedConfig,
          enabled_at: new Date().toISOString(),
          enabled_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      
      if (updateError) {
        console.error('❌ [Monday Callback-Org] Update error:', updateError);
        throw updateError;
      }
      console.log('✅ [Monday Callback-Org] Integration updated successfully');
    } else {
      // Create new integration
      console.log('🟣 [Monday Callback-Org] Creating new integration');
      const { error: insertError } = await supabase
        .from('organization_integrations')
        .insert({
          organization_id: organizationId,
          integration_type: 'monday',
          is_enabled: true,
          configuration: updatedConfig,
          enabled_at: new Date().toISOString(),
          enabled_by: userId,
        });
      
      if (insertError) {
        console.error('❌ [Monday Callback-Org] Insert error:', insertError);
        throw insertError;
      }
      console.log('✅ [Monday Callback-Org] Integration created successfully');
    }

    // Redirect to dashboard integrations tab with success message
    return NextResponse.redirect(
      new URL(
        '/dashboard?tab=integrations&success=' + encodeURIComponent('Monday.com connected successfully for your organization!'),
        process.env.NEXT_PUBLIC_APP_URL
      )
    );
  } catch (error) {
    console.error('❌ [Monday Callback-Org] Exception:', error);
    return NextResponse.redirect(
      new URL(
        `/dashboard?tab=integrations&error=${encodeURIComponent(String(error))}`,
        process.env.NEXT_PUBLIC_APP_URL
      )
    );
  }
}

