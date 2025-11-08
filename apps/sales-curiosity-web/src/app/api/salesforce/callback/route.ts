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
      return NextResponse.redirect(
        new URL(
          '/admin/organization?error=Invalid state parameter',
          process.env.NEXT_PUBLIC_APP_URL
        )
      );
    }

    const { organizationId, userId } = stateData;

    if (!organizationId || !userId) {
      return NextResponse.redirect(
        new URL(
          '/admin/organization?error=Invalid state data',
          process.env.NEXT_PUBLIC_APP_URL
        )
      );
    }

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

    // Exchange code for tokens using org-specific credentials
    const tokens = await exchangeCodeForTokens(code, undefined, orgClientId, orgClientSecret);

    // Merge OAuth tokens with existing configuration (preserve credentials)
    const updatedConfig = {
      ...existingConfig,
      ...tokens,
      connected_at: new Date().toISOString(),
      connected_by: userId,
    };

    if (existing) {
      // Update existing integration
      await supabase
        .from('organization_integrations')
        .update({
          is_enabled: true,
          configuration: updatedConfig,
          enabled_at: new Date().toISOString(),
          enabled_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      // Create new integration
      await supabase
        .from('organization_integrations')
        .insert({
          organization_id: organizationId,
          integration_type: 'salesforce',
          is_enabled: true,
          configuration: updatedConfig,
          enabled_at: new Date().toISOString(),
          enabled_by: userId,
        });
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
