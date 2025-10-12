import { NextRequest, NextResponse } from 'next/server';
import { getSalesforceAuthUrl } from '@/lib/salesforce';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Initiate Salesforce OAuth flow for individual user
 * GET /api/salesforce/auth-user
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user data
    const { data: userData } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('email', session.user.email)
      .maybeSingle();

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
