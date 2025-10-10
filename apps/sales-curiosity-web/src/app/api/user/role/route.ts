import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    // Get session from cookie
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get user's role using service role (bypasses RLS)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, organization_id, full_name')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      console.error('User not found:', userError);
      return NextResponse.json(
        { error: 'User not found in database', userId: user.id },
        { status: 404 }
      );
    }

    // Get organization separately to avoid RLS issues
    const { data: orgData } = await supabase
      .from('organizations')
      .select('name, account_type')
      .eq('id', userData.organization_id)
      .single();

    return NextResponse.json({
      ok: true,
      role: userData.role,
      organizationId: userData.organization_id,
      accountType: orgData?.account_type || 'individual',
      organizationName: orgData?.name || 'Personal Workspace',
      fullName: userData.full_name,
    });

  } catch (err) {
    console.error('Error getting user role:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

