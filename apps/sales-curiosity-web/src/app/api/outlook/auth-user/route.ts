import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getOutlookAuthUrl } from '@/lib/outlook';
import { auth } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    console.log('🟦 [Outlook Auth-User] API called');
    console.log('🟦 [Outlook Auth-User] Headers:', Object.fromEntries(req.headers.entries()));
    
    const session = await auth();
    console.log('🟦 [Outlook Auth-User] Session:', session ? '✓ Valid' : '✗ None');
    console.log('🟦 [Outlook Auth-User] User email:', session?.user?.email);
    
    if (!session?.user?.email) {
      console.error('❌ [Outlook Auth-User] No session or email found');
      return NextResponse.json({ error: 'Unauthorized - please log in' }, { status: 401 });
    }

    // Get user data
    console.log('🟦 [Outlook Auth-User] Querying users table for:', session.user.email);
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('email', session.user.email)
      .maybeSingle();

    if (userError) {
      console.error('❌ [Outlook Auth-User] Database error:', userError);
      return NextResponse.json({ error: `Database error: ${userError.message}` }, { status: 500 });
    }

    if (!userData) {
      console.error('❌ [Outlook Auth-User] User not found in database');
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    console.log('🟦 [Outlook Auth-User] User data:', { id: userData.id, organization_id: userData.organization_id });

    // Use user ID for individual connections, create dummy org if needed
    const organizationId = userData.organization_id || userData.id;
    console.log('🟦 [Outlook Auth-User] Using organization_id:', organizationId);

    // Generate state parameter (userId:organizationId)
    const state = `${userData.id}:${organizationId}`;
    console.log('🟦 [Outlook Auth-User] Generated state:', state);
    
    const authUrl = getOutlookAuthUrl(state);
    console.log('🟦 [Outlook Auth-User] Generated authUrl:', authUrl);

    return NextResponse.json({ ok: true, authUrl });
  } catch (error) {
    console.error('❌ [Outlook Auth-User] Exception:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

