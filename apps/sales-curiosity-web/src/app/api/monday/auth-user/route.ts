import { NextRequest, NextResponse } from 'next/server';
import { getMondayAuthUrl } from '@/lib/monday';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getUserFromExtensionToken } from '@/lib/extension-auth';
import { auth } from '@/lib/auth';

/**
 * Initiate Monday.com OAuth flow for individual user
 * GET /api/monday/auth-user
 */
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  
  try {
    console.log('🟣 [Monday Auth-User] API called');
    
    let userEmail: string | undefined;
    let userId: string | undefined;
    
    // Try extension token first (from Bearer header)
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      console.log('🟣 [Monday Auth-User] Found Bearer token');
      const token = authHeader.substring(7);
      const user = await getUserFromExtensionToken(token);
      if (user) {
        userEmail = user.email;
        userId = user.id;
        console.log('✅ [Monday Auth-User] Extension auth successful:', userEmail);
      }
    }
    
    // Fall back to NextAuth session (for web app)
    if (!userEmail) {
      console.log('🟣 [Monday Auth-User] Checking NextAuth session...');
      const session = await auth();
      if (session?.user?.email) {
        userEmail = session.user.email;
        console.log('✅ [Monday Auth-User] NextAuth successful:', userEmail);
      }
    }
    
    if (!userEmail) {
      console.error('❌ [Monday Auth-User] No authentication found');
      return NextResponse.json({ error: 'Unauthorized - please log in' }, { status: 401 });
    }

    // Get user data if we don't have it yet
    if (!userId) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, organization_id')
        .eq('email', userEmail)
        .maybeSingle();

      if (userError || !userData) {
        console.error('❌ [Monday Auth-User] User not found:', userError);
        return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
      }
      
      userId = userData.id;
    }
    
    // Get full user data for organizationId
    const { data: userData } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('id', userId)
      .single();

    if (!userData) {
      console.error('❌ [Monday Auth-User] User data not found');
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    const organizationId = userData.organization_id || userData.id;
    console.log('🟣 [Monday Auth-User] User ID:', userId, 'Org ID:', organizationId);

    // Check if already connected
    const { data: existingConnection } = await supabase
      .from('organization_integrations')
      .select('id, is_enabled, configuration')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'monday_user')
      .eq('is_enabled', true)
      .maybeSingle();

    if (existingConnection?.configuration) {
      const config = existingConnection.configuration as any;
      const userTokens = config && config[userId];
      
      if (userTokens && userTokens.access_token) {
        console.log('✅ [Monday Auth-User] Already connected!');
        return NextResponse.json({
          ok: true,
          connected: true,
          message: 'Monday.com already connected'
        });
      }
    }

    // Not connected, generate OAuth URL
    console.log('🟣 [Monday Auth-User] Creating OAuth state...');
    const state = Buffer.from(
      JSON.stringify({
        userId: userData.id,
        organizationId: organizationId,
        type: 'user',
        timestamp: Date.now(),
      })
    ).toString('base64url');

    const authUrl = getMondayAuthUrl(state, true);
    console.log('✅ [Monday Auth-User] Generated auth URL');

    return NextResponse.json({
      ok: true,
      connected: false,
      authUrl,
    });
  } catch (error) {
    console.error('❌ [Monday Auth-User] Exception:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
