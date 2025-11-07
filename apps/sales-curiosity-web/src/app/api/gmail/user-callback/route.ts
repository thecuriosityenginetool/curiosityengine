import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { exchangeCodeForTokens } from '@/lib/gmail';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    console.log('🟩 [Gmail Callback] Starting callback handler');
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    console.log('🟩 [Gmail Callback] Params:', { 
      hasCode: !!code, 
      codeLength: code?.length,
      state 
    });

    if (!code || !state) {
      console.error('❌ [Gmail Callback] Missing code or state');
      return NextResponse.redirect(
        new URL('/dashboard?error=Invalid Gmail callback', process.env.NEXT_PUBLIC_APP_URL)
      );
    }

    // Parse state (userId:organizationId)
    const [userId, organizationId] = state.split(':');

    console.log('🟩 [Gmail Callback] Parsed state:', { userId, organizationId });

    if (!userId || !organizationId) {
      console.error('❌ [Gmail Callback] Invalid userId or organizationId');
      return NextResponse.redirect(
        new URL('/dashboard?error=Invalid state parameter', process.env.NEXT_PUBLIC_APP_URL)
      );
    }

    // Exchange code for tokens
    console.log('🟩 [Gmail Callback] Exchanging code for tokens...');
    const tokens = await exchangeCodeForTokens(code);
    console.log('🟩 [Gmail Callback] Tokens received:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expires_in
    });

    // Store tokens at user level
    console.log('🟩 [Gmail Callback] Checking for existing integration...');
    const { data: existing, error: existingError } = await supabase
      .from('organization_integrations')
      .select('id, configuration')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'gmail_user')
      .maybeSingle();

    console.log('🟩 [Gmail Callback] Existing integration:', { 
      found: !!existing, 
      error: existingError?.message 
    });

    const userTokens = {
      [userId]: tokens
    };

    if (existing) {
      // Merge with existing user tokens
      console.log('🟩 [Gmail Callback] Updating existing integration...');
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
        console.error('❌ [Gmail Callback] Update error:', updateError);
        throw updateError;
      }
      console.log('✅ [Gmail Callback] Integration updated successfully');
    } else {
      // Create new user-level integration
      console.log('🟩 [Gmail Callback] Creating new integration...');
      const { error: insertError } = await supabase
        .from('organization_integrations')
        .insert({
          organization_id: organizationId,
          integration_type: 'gmail_user',
          is_enabled: true,
          configuration: userTokens,
          enabled_at: new Date().toISOString(),
          enabled_by: userId,
        });

      if (insertError) {
        console.error('❌ [Gmail Callback] Insert error:', insertError);
        throw insertError;
      }
      console.log('✅ [Gmail Callback] New integration created successfully');
    }

    // Log activity for both Gmail and Google Calendar connection
    console.log('🟩 [Gmail Callback] Logging activity...');
    const { error: logError } = await supabase
      .from('activity_logs')
      .insert([
        {
          user_id: userId,
          organization_id: organizationId,
          activity_type: 'integration_connected',
          description: 'Google Workspace Connected',
          details: 'Gmail and Google Calendar integration enabled',
          created_at: new Date().toISOString()
        }
      ]);

    if (logError) {
      console.error('⚠️ [Gmail Callback] Activity log error (non-critical):', logError);
    } else {
      console.log('✅ [Gmail Callback] Activity logged');
    }

    return NextResponse.redirect(
      new URL('/dashboard?success=Google Workspace connected successfully (Gmail + Calendar)', process.env.NEXT_PUBLIC_APP_URL)
    );
  } catch (error) {
    console.error('❌ [Gmail Callback] Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error connecting Google Workspace';
    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent(errorMessage)}`, process.env.NEXT_PUBLIC_APP_URL)
    );
  }
}

