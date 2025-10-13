import { NextRequest, NextResponse } from 'next/server';
import { getSalesforceAuthUrl } from '@/lib/salesforce';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getUserFromExtensionToken } from '@/lib/extension-auth';
import { auth } from '@/lib/auth';

/**
 * Initiate Salesforce OAuth flow for individual user
 * GET /api/salesforce/auth-user
 */
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  
  try {
    let userEmail: string | undefined;
    let userId: string | undefined;
    
    // Try extension token first (from Bearer header)
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = await getUserFromExtensionToken(token);
      if (user) {
        userEmail = user.email;
        userId = user.id;
      }
    }
    
    // Fall back to NextAuth session (for web app)
    if (!userEmail) {
      const session = await auth();
      if (session?.user?.email) {
        userEmail = session.user.email;
      }
    }
    
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user data if we don't have it yet
    if (!userId) {
      const { data: userData } = await supabase
        .from('users')
        .select('id, organization_id')
        .eq('email', userEmail)
        .maybeSingle();

      if (!userData) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Use user ID for individual connections, create dummy org if needed
    const organizationId = userData.organization_id || userData.id;

    // Create state token with user_id and organization_id
    const state = Buffer.from(
      JSON.stringify({
        userId: userData.id,
        organizationId: organizationId,
        type: 'user', // Mark this as user-level connection
        timestamp: Date.now(),
      })
    ).toString('base64url');

    // Generate Salesforce OAuth URL (user-level = true)
    const authUrl = getSalesforceAuthUrl(state, true);

    return NextResponse.json({
      ok: true,
      authUrl,
    });
  } catch (error) {
    console.error('Error initiating user Salesforce OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}
