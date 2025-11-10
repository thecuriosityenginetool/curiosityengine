import { NextRequest, NextResponse } from 'next/server';
import { getMondayAuthUrl } from '@/lib/monday';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { auth } from '@/lib/auth';

/**
 * Initiate Monday.com OAuth flow for organization-level connection
 * GET /api/monday/auth
 */
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  
  try {
    console.log('🟣 [Monday Auth-Org] API called');
    
    // Get user from NextAuth session
    const session = await auth();
    console.log('🟣 [Monday Auth-Org] Session check:', session ? 'Valid' : 'None');
    
    if (!session?.user?.email) {
      console.error('❌ [Monday Auth-Org] No session found');
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;
    console.log('🟣 [Monday Auth-Org] User email:', userEmail);

    // Get user data from Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, organization_id, role')
      .eq('email', userEmail)
      .single();

    if (userError || !user) {
      console.error('❌ [Monday Auth-Org] User not found:', userError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('🟣 [Monday Auth-Org] User role:', user.role);

    // Check if user has permission to enable integrations
    if (!['org_admin', 'super_admin'].includes(user.role)) {
      console.error('❌ [Monday Auth-Org] Insufficient permissions. Role:', user.role);
      return NextResponse.json(
        { error: 'Only organization admins can enable organization-level Monday.com integration' },
        { status: 403 }
      );
    }

    // Create state token with organization_id, user_id, and type marker
    const state = Buffer.from(
      JSON.stringify({
        organizationId: user.organization_id,
        userId: user.id,
        type: 'org', // Mark this as org-level connection
        timestamp: Date.now(),
      })
    ).toString('base64url');

    console.log('🟣 [Monday Auth-Org] Generated state token with type=org');

    // Get org-specific Monday.com credentials (if configured)
    const { data: integration } = await supabase
      .from('organization_integrations')
      .select('configuration')
      .eq('organization_id', user.organization_id)
      .eq('integration_type', 'monday')
      .maybeSingle();

    const config = integration?.configuration as any || {};
    const orgClientId = config.client_id;

    // Fall back to global credentials if org-specific not configured
    if (!orgClientId) {
      console.log('🟣 [Monday Auth-Org] No org-specific credentials, using global env vars');
    } else {
      console.log('🟣 [Monday Auth-Org] Using org-specific credentials');
    }

    // Generate Monday.com OAuth URL (isUserLevel = false for org connection)
    // Will use orgClientId if provided, otherwise falls back to env var
    const authUrl = getMondayAuthUrl(state, false);
    console.log('🟣 [Monday Auth-Org] Generated auth URL');

    return NextResponse.json({
      ok: true,
      authUrl,
    });
  } catch (error) {
    console.error('❌ [Monday Auth-Org] Exception:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}

