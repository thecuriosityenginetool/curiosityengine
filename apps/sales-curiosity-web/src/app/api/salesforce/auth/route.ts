import { NextRequest, NextResponse } from 'next/server';
import { getSalesforceAuthUrl } from '@/lib/salesforce';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Initiate Salesforce OAuth flow
 * GET /api/salesforce/auth?userId=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Verify user and get organization_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, organization_id, role')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to enable integrations
    if (!['org_admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Only organization admins can enable Salesforce integration' },
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

    // Generate Salesforce OAuth URL
    const authUrl = getSalesforceAuthUrl(state);

    return NextResponse.json({
      ok: true,
      authUrl,
    });
  } catch (error) {
    console.error('Error initiating Salesforce OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}
