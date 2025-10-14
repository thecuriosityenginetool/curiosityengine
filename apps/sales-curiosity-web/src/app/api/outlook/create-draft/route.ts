import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { createOutlookDraft } from '@/lib/outlook';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    console.log('📧 [Create Draft] API called');
    
    const session = await auth();
    if (!session?.user?.email) {
      console.error('❌ [Create Draft] No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, subject, body } = await req.json();
    
    if (!to || !subject || !body) {
      console.error('❌ [Create Draft] Missing required fields:', { to: !!to, subject: !!subject, body: !!body });
      return NextResponse.json({ 
        error: 'Missing required fields: to, subject, body' 
      }, { status: 400 });
    }

    console.log('📧 [Create Draft] Creating draft:', { to, subject, bodyLength: body.length });

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('email', session.user.email)
      .maybeSingle();

    if (userError) {
      console.error('❌ [Create Draft] Error fetching user:', userError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!userData) {
      console.error('❌ [Create Draft] User not found:', session.user.email);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const organizationId = userData.organization_id || userData.id;
    console.log('📧 [Create Draft] User info:', { userId: userData.id, organizationId });

    // Create the draft using the Outlook library
    const result = await createOutlookDraft(
      organizationId,
      { to, subject, body },
      userData.id
    );

    console.log('✅ [Create Draft] Draft created successfully:', { id: result.id });

    return NextResponse.json({
      success: true,
      draftId: result.id,
      message: 'Draft created successfully in Outlook'
    });

  } catch (error) {
    console.error('❌ [Create Draft] Exception:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 });
  }
}
