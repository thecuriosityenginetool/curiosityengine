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

    // Generate state parameter (userId:organizationId)
    const state = `${userData.id}:${organizationId}`;
    const authUrl = getOutlookAuthUrl(state);

    return NextResponse.json({ ok: true, authUrl });
  } catch (error) {
    console.error('Error initiating Outlook auth:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

