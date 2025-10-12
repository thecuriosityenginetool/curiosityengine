import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Look up user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, role, organization_id, email_provider')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get organization data if user is in an org
    let organization = null;
    if (user.organization_id) {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('id, name, account_type')
        .eq('id', user.organization_id)
        .single();
      
      if (orgData) {
        organization = orgData;
      }
    }

    // Get user context
    const { data: contextData } = await supabase
      .from('user_context')
      .select('about_me, objectives')
      .eq('user_id', user.id)
      .single();

    // Get organization context if applicable
    let orgContext = null;
    if (user.organization_id && user.role === 'admin') {
      const { data: orgContextData } = await supabase
        .from('organization_context')
        .select('company_overview, target_customers, value_propositions, key_products')
        .eq('organization_id', user.organization_id)
        .single();
      
      if (orgContextData) {
        orgContext = orgContextData;
      }
    }

    // Generate a session token (simplified - you might want to use JWT)
    const sessionToken = Buffer.from(
      JSON.stringify({
        userId: user.id,
        email: user.email,
        timestamp: Date.now(),
      })
    ).toString('base64');

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        emailProvider: user.email_provider,
      },
      organization,
      context: contextData || {},
      organizationContext: orgContext,
      authToken: sessionToken,
    });
  } catch (error: any) {
    console.error('Error authenticating extension user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to authenticate' },
      { status: 500 }
    );
  }
}

