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

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Store tokens in database
    const { data: existing } = await supabase
      .from('organization_integrations')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'salesforce')
      .single();

    if (existing) {
      // Update existing integration
      await supabase
        .from('organization_integrations')
        .update({
          is_enabled: true,
          configuration: tokens,
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
          configuration: tokens,
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

    // Redirect to admin dashboard with success message
    return NextResponse.redirect(
      new URL(
        '/admin/organization?success=Salesforce connected successfully',
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
