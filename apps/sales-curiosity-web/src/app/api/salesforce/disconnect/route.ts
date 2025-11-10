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

    console.log('🟪 [Salesforce Disconnect] Disconnecting for user:', userData.id, 'org:', userData.organization_id);

    // Check what Salesforce integrations exist
    const { data: existingIntegrations } = await supabase
      .from('organization_integrations')
      .select('id, integration_type, is_enabled')
      .eq('organization_id', userData.organization_id)
      .in('integration_type', ['salesforce', 'salesforce_user']);
    
    console.log('🟪 [Salesforce Disconnect] Found integrations:', existingIntegrations);

    // Delete ALL Salesforce integrations for this org (both user and org level)
    const { error: deleteError } = await supabase
      .from('organization_integrations')
      .delete()
      .eq('organization_id', userData.organization_id)
      .in('integration_type', ['salesforce', 'salesforce_user']);

    if (deleteError) {
      console.error('❌ [Salesforce Disconnect] Error:', deleteError);
      return NextResponse.json({ error: 'Failed to disconnect Salesforce' }, { status: 500 });
    }

    console.log('✅ [Salesforce Disconnect] All Salesforce integrations deleted');

    return NextResponse.json({ 
      success: true, 
      message: 'Salesforce disconnected successfully' 
    });

  } catch (error) {
    console.error('Error in Salesforce disconnect:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}