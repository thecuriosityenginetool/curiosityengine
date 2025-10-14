import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
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

    // Delete Outlook connection
    const { error } = await supabase
      .from('organization_integrations')
      .delete()
      .eq('organization_id', userData.organization_id)
      .eq('integration_type', 'outlook');

    if (error) {
      console.error('Error disconnecting Outlook:', error);
      return NextResponse.json({ error: 'Failed to disconnect Outlook' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Outlook disconnected successfully' 
    });

  } catch (error) {
    console.error('Error in Outlook disconnect:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}