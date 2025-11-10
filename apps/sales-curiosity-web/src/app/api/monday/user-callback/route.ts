import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/monday';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Monday.com OAuth callback for individual users
 * GET /api/monday/user-callback?code=xxx&state=xxx
 */
export async function GET(req: NextRequest) {
  try {
    console.log('🟣 [Monday Callback] OAuth callback received');
    
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for OAuth errors
    if (error) {
      const errorDescription = searchParams.get('error_description');
      console.error('❌ [Monday Callback] OAuth error:', error, errorDescription);
      
      return NextResponse.redirect(
        new URL(
          `/dashboard?error=${encodeURIComponent(errorDescription || error)}`,
          process.env.NEXT_PUBLIC_APP_URL
        )
      );
    }

    if (!code || !state) {
      console.error('❌ [Monday Callback] Missing code or state');
      return NextResponse.redirect(
        new URL(
          '/dashboard?error=Invalid OAuth callback - missing parameters',
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
      console.log('🟣 [Monday Callback] Decoded state:', { 
        userId: stateData.userId, 
        organizationId: stateData.organizationId,
        type: stateData.type 
      });
    } catch (e) {
      console.error('❌ [Monday Callback] Invalid state parameter:', e);
      return NextResponse.redirect(
        new URL(
          '/dashboard?error=Invalid state parameter',
          process.env.NEXT_PUBLIC_APP_URL
        )
      );
    }

    const { userId, organizationId, type } = stateData;

    if (!userId || type !== 'user') {
      console.error('❌ [Monday Callback] Invalid state data. userId:', userId, 'type:', type);
      return NextResponse.redirect(
        new URL(
          '/dashboard?error=Invalid callback data',
          process.env.NEXT_PUBLIC_APP_URL
        )
      );
    }

    // Exchange code for tokens
    const userCallbackUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/monday/user-callback`;
    console.log('🟣 [Monday Callback] Exchanging code for tokens...');
    const tokens = await exchangeCodeForTokens(code, userCallbackUri);
    console.log('✅ [Monday Callback] Tokens received');

    // Check for existing connection
    const { data: existing } = await supabase
      .from('organization_integrations')
      .select('id, configuration')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'monday_user')
      .maybeSingle();

    console.log('🟣 [Monday Callback] Existing connection:', existing ? 'Found' : 'Not found');

    const userTokens = {
      [userId]: tokens
    };

    if (existing) {
      // Update existing - merge with other users' tokens
      console.log('🟣 [Monday Callback] Updating existing connection...');
      const existingConfig = existing.configuration as any || {};
      const mergedConfig = {
        ...existingConfig,
        ...userTokens
      };

      const { error: updateError } = await supabase
        .from('organization_integrations')
        .update({
          is_enabled: true,
          configuration: mergedConfig,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('❌ [Monday Callback] Update error:', updateError);
        throw updateError;
      }
      console.log('✅ [Monday Callback] Connection updated successfully');
    } else {
      // Create new
      console.log('🟣 [Monday Callback] Creating new connection...');
      const { error: insertError } = await supabase
        .from('organization_integrations')
        .insert({
          organization_id: organizationId,
          integration_type: 'monday_user',
          is_enabled: true,
          configuration: userTokens,
          enabled_at: new Date().toISOString(),
          enabled_by: userId,
        });

      if (insertError) {
        console.error('❌ [Monday Callback] Insert error:', insertError);
        throw insertError;
      }
      console.log('✅ [Monday Callback] Connection created successfully');
    }

    // Redirect back to dashboard with success message
    return NextResponse.redirect(
      new URL(
        '/dashboard?success=Monday.com connected successfully&tab=integrations',
        process.env.NEXT_PUBLIC_APP_URL
      )
    );
  } catch (error) {
    console.error('❌ [Monday Callback] Exception:', error);
    return NextResponse.redirect(
      new URL(
        `/dashboard?error=${encodeURIComponent(String(error))}`,
        process.env.NEXT_PUBLIC_APP_URL
      )
    );
  }
}
