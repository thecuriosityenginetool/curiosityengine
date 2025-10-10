import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/salesforce';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Salesforce OAuth callback for individual users
 * GET /api/salesforce/user-callback?code=xxx&state=xxx
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
      
      return NextResponse.redirect(
        new URL(
          `/dashboard?error=${encodeURIComponent(errorDescription || error)}`,
          process.env.NEXT_PUBLIC_APP_URL
        )
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL(
          '/dashboard?error=Invalid OAuth callback',
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
          '/dashboard?error=Invalid state parameter',
          process.env.NEXT_PUBLIC_APP_URL
        )
      );
    }

    const { userId, organizationId, type } = stateData;

    if (!userId || type !== 'user') {
      return NextResponse.redirect(
        new URL(
          '/dashboard?error=Invalid callback data',
          process.env.NEXT_PUBLIC_APP_URL
        )
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Store tokens at user level in organization_integrations
    // Use a composite approach: store with user_id in configuration
    const { data: existing } = await supabase
      .from('organization_integrations')
      .select('id, configuration')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'salesforce_user')
      .single();

    // Store user-specific tokens in configuration with user_id key
    const userTokens = {
      [userId]: tokens
    };

    if (existing) {
      // Merge with existing user tokens
      const existingConfig = existing.configuration as any || {};
      const mergedConfig = {
        ...existingConfig,
        ...userTokens
      };

      await supabase
        .from('organization_integrations')
        .update({
          is_enabled: true,
          configuration: mergedConfig,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      // Create new user-level integration
      await supabase
        .from('organization_integrations')
        .insert({
          organization_id: organizationId,
          integration_type: 'salesforce_user',
          is_enabled: true,
          configuration: userTokens,
          enabled_at: new Date().toISOString(),
          enabled_by: userId,
        });
    }

    // Redirect to dashboard with success message
    return NextResponse.redirect(
      new URL(
        '/dashboard?success=Salesforce connected successfully',
        process.env.NEXT_PUBLIC_APP_URL
      )
    );
  } catch (error) {
    console.error('Error handling user Salesforce callback:', error);
    return NextResponse.redirect(
      new URL(
        `/dashboard?error=${encodeURIComponent(String(error))}`,
        process.env.NEXT_PUBLIC_APP_URL
      )
    );
  }
}
