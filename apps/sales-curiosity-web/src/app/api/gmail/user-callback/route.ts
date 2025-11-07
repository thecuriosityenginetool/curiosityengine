import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { exchangeCodeForTokens } from '@/lib/gmail';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard?error=Invalid Gmail callback', process.env.NEXT_PUBLIC_APP_URL)
      );
    }

    // Parse state (userId:organizationId)
    const [userId, organizationId] = state.split(':');

    if (!userId || !organizationId) {
      return NextResponse.redirect(
        new URL('/dashboard?error=Invalid state parameter', process.env.NEXT_PUBLIC_APP_URL)
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Store tokens at user level
    const { data: existing } = await supabase
      .from('organization_integrations')
      .select('id, configuration')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'gmail_user')
      .single();

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
          integration_type: 'gmail_user',
          is_enabled: true,
          configuration: userTokens,
          enabled_at: new Date().toISOString(),
          enabled_by: userId,
        });
    }

    // Log activity for both Gmail and Google Calendar connection
    await supabase
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

    return NextResponse.redirect(
      new URL('/dashboard?success=Google Workspace connected successfully (Gmail + Calendar)', process.env.NEXT_PUBLIC_APP_URL)
    );
  } catch (error) {
    console.error('Error handling Gmail callback:', error);
    return NextResponse.redirect(
      new URL(`/dashboard?error=${encodeURIComponent(String(error))}`, process.env.NEXT_PUBLIC_APP_URL)
    );
  }
}

