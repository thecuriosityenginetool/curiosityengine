import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/salesforce';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Salesforce OAuth callback
 * GET /api/salesforce/callback?code=xxx&state=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for OAuth errors
    if (error) {
      const errorDescription = searchParams.get('error_description');
      console.error('Salesforce OAuth error:', error, errorDescription);
      
      // Redirect to admin dashboard with error
      return NextResponse.redirect(
        new URL(
          `/admin/organization?error=${encodeURIComponent(errorDescription || error)}`,
          process.env.NEXT_PUBLIC_APP_URL
        )
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL(
          '/admin/organization?error=Invalid OAuth callback',
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
    } catch (e) {
      console.error('❌ [Salesforce Callback] Invalid state parameter:', e);
      return NextResponse.redirect(
        new URL(
          '/dashboard?error=Invalid state parameter',
          process.env.NEXT_PUBLIC_APP_URL
        )
      );
    }

    const { organizationId, userId, type } = stateData;
    
    console.log('🟪 [Salesforce Callback] Decoded state:', { organizationId, userId, type });

    // Validate this is org-level callback
    // Accept both type='org' (new) and missing type (legacy) for backward compatibility
    if (!organizationId || !userId) {
      console.error('❌ [Salesforce Callback] Missing required state data:', stateData);
      return NextResponse.redirect(
        new URL(
          '/dashboard?error=Invalid callback data - missing organizationId or userId',
          process.env.NEXT_PUBLIC_APP_URL
        )
      );
    }
    
    // If type is explicitly set, verify it's 'org'
    if (type && type !== 'org') {
      console.error('❌ [Salesforce Callback] Wrong callback type:', type);
      return NextResponse.redirect(
        new URL(
          '/dashboard?error=Invalid callback - wrong connection type',
          process.env.NEXT_PUBLIC_APP_URL
        )
      );
    }
    
    console.log('✅ [Salesforce Callback] Valid org-level callback');

    // Get org-specific Salesforce credentials
    const { data: existing } = await supabase
      .from('organization_integrations')
      .select('id, configuration')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'salesforce')
      .maybeSingle();

    const existingConfig = existing?.configuration as any || {};
    const orgClientId = existingConfig.client_id;
    const orgClientSecret = existingConfig.client_secret;

    if (!orgClientId || !orgClientSecret) {
      console.error('❌ [Salesforce Callback] No credentials found for organization');
      return NextResponse.redirect(
        new URL(
          '/dashboard?tab=integrations&error=' + encodeURIComponent('Salesforce credentials not found. Please configure them first.'),
          process.env.NEXT_PUBLIC_APP_URL
        )
      );
    }

    console.log('🟪 [Salesforce Callback] Using org-specific credentials for token exchange');
    console.log('🟪 [Salesforce Callback] Client ID:', orgClientId?.substring(0, 10) + '...');

    // Exchange code for tokens using org-specific credentials
    console.log('🟪 [Salesforce Callback] Exchanging authorization code...');
    const tokens = await exchangeCodeForTokens(code, undefined, orgClientId, orgClientSecret);
    console.log('✅ [Salesforce Callback] Token exchange successful!');
    console.log('🟪 [Salesforce Callback] Received tokens:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      hasInstanceUrl: !!tokens.instance_url,
    });

    // Merge OAuth tokens with existing configuration (preserve credentials)
    const updatedConfig = {
      ...existingConfig,
      ...tokens,
      connected_at: new Date().toISOString(),
      connected_by: userId,
    };

    console.log('🟪 [Salesforce Callback] Merged config keys:', Object.keys(updatedConfig));

    if (existing) {
      // Update existing integration
      console.log('🟪 [Salesforce Callback] Updating existing integration ID:', existing.id);
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
        console.error('❌ [Salesforce Callback] Update error:', updateError);
        throw updateError;
      }
      console.log('✅ [Salesforce Callback] Integration updated successfully');
    } else {
      // Create new integration
      console.log('🟪 [Salesforce Callback] Creating new integration...');
      const { error: insertError } = await supabase
        .from('organization_integrations')
        .insert({
          organization_id: organizationId,
          integration_type: 'salesforce',
          is_enabled: true,
          configuration: updatedConfig,
          enabled_at: new Date().toISOString(),
          enabled_by: userId,
        });
      
      if (insertError) {
        console.error('❌ [Salesforce Callback] Insert error:', insertError);
        throw insertError;
      }
      console.log('✅ [Salesforce Callback] Integration created successfully');
    }

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_organization_id: organizationId,
      p_action: 'salesforce_integration_enabled',
      p_resource_type: 'integration',
      p_details: { integration_type: 'salesforce' },
    });

    // Redirect to dashboard integrations tab with success message
    return NextResponse.redirect(
      new URL(
        '/dashboard?tab=integrations&success=' + encodeURIComponent('Salesforce connected successfully! Your team can now use CRM data.'),
        process.env.NEXT_PUBLIC_APP_URL
      )
    );
  } catch (error) {
    console.error('Error handling Salesforce callback:', error);
    return NextResponse.redirect(
      new URL(
        `/admin/organization?error=${encodeURIComponent(String(error))}`,
        process.env.NEXT_PUBLIC_APP_URL
      )
    );
  }
}
