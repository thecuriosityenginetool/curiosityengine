import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { exchangeCodeForTokens } from '@/lib/outlook';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    console.log('🔵 Outlook callback received:', { code: code?.substring(0, 20) + '...', state });

    if (!code || !state) {
      console.error('❌ Missing code or state');
      return NextResponse.redirect(
        new URL('/dashboard?error=Invalid Outlook callback', process.env.NEXT_PUBLIC_APP_URL)
      );
    }

    // Parse state (userId:organizationId)
    const [userId, organizationId] = state.split(':');

    console.log('🔵 Parsed state:', { userId, organizationId });

    if (!userId || !organizationId) {
      console.error('❌ Invalid userId or organizationId');
      return NextResponse.redirect(
        new URL('/dashboard?error=Invalid state parameter', process.env.NEXT_PUBLIC_APP_URL)
      );
    }

    // Exchange code for tokens
    console.log('🔵 Exchanging code for tokens...');
    const tokens = await exchangeCodeForTokens(code);
    console.log('✅ Tokens received:', { 
      hasAccessToken: !!tokens.access_token, 
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expires_in 
    });

    // Store tokens at user level - use maybeSingle to avoid error when no record exists
    const { data: existing, error: fetchError } = await supabase
      .from('organization_integrations')
      .select('id, configuration')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'outlook') // Use 'outlook' instead of 'outlook_user'
      .maybeSingle();

    if (fetchError) {
      console.error('❌ Error fetching existing integration:', fetchError);
      throw new Error(`Database error: ${fetchError.message}`);
    }

    console.log('🔵 Existing integration:', existing ? 'Found' : 'Not found');

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

      console.log('🔵 Updating existing integration...');
      const { error: updateError } = await supabase
        .from('organization_integrations')
        .update({
          is_enabled: true,
          configuration: mergedConfig,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('❌ Error updating integration:', updateError);
        throw new Error(`Update failed: ${updateError.message}`);
      }
      console.log('✅ Integration updated successfully');
    } else {
      // Create new user-level integration
      console.log('🔵 Creating new integration...');
      const { error: insertError } = await supabase
        .from('organization_integrations')
        .insert({
          organization_id: organizationId,
          integration_type: 'outlook', // Use 'outlook' instead of 'outlook_user'
          is_enabled: true,
          configuration: userTokens,
          enabled_at: new Date().toISOString(),
          enabled_by: userId,
        });

      if (insertError) {
        console.error('❌ Error inserting integration:', insertError);
        throw new Error(`Insert failed: ${insertError.message}`);
      }
      console.log('✅ Integration created successfully');
    }

    console.log('✅ Outlook connection successful, redirecting to dashboard');
    return NextResponse.redirect(
      new URL('/dashboard?success=Outlook connected successfully', process.env.NEXT_PUBLIC_APP_URL)
    );
  } catch (error) {
    console.error('❌ Error handling Outlook callback:', error);
    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent(String(error))}`, process.env.NEXT_PUBLIC_APP_URL)
    );
  }
}

