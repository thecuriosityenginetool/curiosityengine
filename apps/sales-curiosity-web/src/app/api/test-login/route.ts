import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    
    console.log('Testing login for:', email);

    // Test 1: Supabase password auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return NextResponse.json({
        step: 'Supabase Auth',
        success: false,
        error: authError.message,
        details: authError
      });
    }

    if (!authData.user) {
      return NextResponse.json({
        step: 'Supabase Auth',
        success: false,
        error: 'No user returned'
      });
    }

    // Test 2: Get user from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, role, organization_id')
      .eq('id', authData.user.id)
      .single();

    if (userError) {
      return NextResponse.json({
        step: 'Database Query',
        success: false,
        error: userError.message,
        details: userError,
        userId: authData.user.id
      });
    }

    if (!userData) {
      return NextResponse.json({
        step: 'Database Query',
        success: false,
        error: 'User not found in public.users table',
        userId: authData.user.id
      });
    }

    // Test 3: Get organization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('name, account_type')
      .eq('id', userData.organization_id)
      .single();

    return NextResponse.json({
      success: true,
      message: 'All steps passed!',
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.full_name,
        role: userData.role,
        organizationId: userData.organization_id,
        organizationName: orgData?.name || 'Not found',
        accountType: orgData?.account_type || 'Not found',
      },
      organizationQueryError: orgError?.message || null
    });

  } catch (error) {
    return NextResponse.json({
      step: 'Exception',
      success: false,
      error: (error as Error).message,
      details: error
    });
  }
}

