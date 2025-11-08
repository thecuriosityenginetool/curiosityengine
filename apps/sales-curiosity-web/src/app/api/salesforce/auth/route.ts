import { NextRequest, NextResponse } from 'next/server';
import { getSalesforceAuthUrl } from '@/lib/salesforce';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { auth } from '@/lib/auth';

/**
 * Initiate Salesforce OAuth flow for organization-level connection
 * GET /api/salesforce/auth
 */
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  
  try {
    console.log('🟪 [Salesforce Auth-Org] API called');
    
    // Get user from NextAuth session
    const session = await auth();
    console.log('🟪 [Salesforce Auth-Org] Session check:', session ? 'Valid' : 'None');
    
    if (!session?.user?.email) {
      console.error('❌ [Salesforce Auth-Org] No session found - user not authenticated');
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;
    console.log('🟪 [Salesforce Auth-Org] User email:', userEmail);

    // Get user data from Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, organization_id, role')
      .eq('email', userEmail)
      .single();

    if (userError || !user) {
      console.error('❌ [Salesforce Auth-Org] User not found:', userError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('🟪 [Salesforce Auth-Org] User role:', user.role);

    // Check if user has permission to enable integrations
    if (!['org_admin', 'super_admin'].includes(user.role)) {
      console.error('❌ [Salesforce Auth-Org] Insufficient permissions. Role:', user.role);
      return NextResponse.json(
        { error: 'Only organization admins can enable organization-level Salesforce integration' },
        { status: 403 }
      );
    }

    // Create state token with organization_id and user_id
    const state = Buffer.from(
      JSON.stringify({
        organizationId: user.organization_id,
        userId: user.id,
        timestamp: Date.now(),
      })
    ).toString('base64url');

    console.log('🟪 [Salesforce Auth-Org] Generated state token');

    // Generate Salesforce OAuth URL (isUserLevel = false for org connection)
    const authUrl = getSalesforceAuthUrl(state, false);
    console.log('🟪 [Salesforce Auth-Org] Generated auth URL');

    return NextResponse.json({
      ok: true,
      authUrl,
    });
  } catch (error) {
    console.error('❌ [Salesforce Auth-Org] Exception:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}
