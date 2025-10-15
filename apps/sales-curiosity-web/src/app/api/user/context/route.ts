import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function corsHeaders(origin?: string) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function isAllowedOrigin(origin: string | null) {
  if (!origin) return true; // Allow requests without origin (like from same domain)
  const allowed = [
    'chrome-extension://',
    process.env.NEXT_PUBLIC_APP_URL || '',
    'https://your-app.vercel.app',
    'http://localhost:3000',
    'https://curiosityengine.io',
    'https://www.curiosityengine.io'
  ];
  return allowed.some((prefix) => origin.startsWith(prefix));
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return NextResponse.json({}, { status: 200, headers: corsHeaders(origin) });
}

// GET user's context
export async function GET(req: NextRequest) {
  try {
    const origin = req.headers.get('origin');
    
    if (!isAllowedOrigin(origin)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: corsHeaders(origin) }
      );
    }

    // Get auth token from header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401, headers: corsHeaders(origin) }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401, headers: corsHeaders(origin) }
      );
    }

    // Get user's context from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_context')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user context:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user context' },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        userContext: userData?.user_context || { aboutMe: '', objectives: '' }
      },
      { headers: corsHeaders(origin) }
    );

  } catch (err) {
    console.error('Error in user context endpoint:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

// PUT/Update user's context
export async function PUT(req: NextRequest) {
  try {
    const origin = req.headers.get('origin');
    
    if (!isAllowedOrigin(origin)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: corsHeaders(origin) }
      );
    }

    // Use NextAuth session instead of Bearer token
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - No session found' },
        { status: 401, headers: corsHeaders(origin) }
      );
    }
    
    console.log('🔑 Context save request from:', session.user.email);

    const body = await req.json();
    const { userContext } = body;

    if (!userContext || typeof userContext !== 'object') {
      return NextResponse.json(
        { error: 'Invalid user context provided' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Get user ID from auth.users using email
    const { data: authUser } = await supabase.auth.admin.listUsers();
    const matchingUser = authUser.users.find(u => u.email === session.user.email);
    
    if (!matchingUser) {
      return NextResponse.json(
        { error: 'User not found in auth system' },
        { status: 404, headers: corsHeaders(origin) }
      );
    }

    console.log('👤 Found user ID:', matchingUser.id);

    // Check if user exists in public.users
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', matchingUser.id)
      .maybeSingle();

    if (existingUser) {
      // User exists, just update context
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          user_context: userContext,
          updated_at: new Date().toISOString()
        })
        .eq('id', matchingUser.id);

      if (updateError) {
        console.error('Error updating user context:', updateError);
        return NextResponse.json(
          { error: 'Failed to update user context: ' + updateError.message },
          { status: 500, headers: corsHeaders(origin) }
        );
      }
    } else {
      // User doesn't exist, create new record
      const { error: insertError } = await supabase
        .from('users')
        .insert({ 
          id: matchingUser.id,
          email: session.user.email,
          full_name: session.user.name || session.user.email?.split('@')[0],
          user_context: userContext
        });

      if (insertError) {
        console.error('Error inserting user:', insertError);
        return NextResponse.json(
          { error: 'Failed to create user record: ' + insertError.message },
          { status: 500, headers: corsHeaders(origin) }
        );
      }
    }

    console.log('✅ Context saved successfully for:', session.user.email);

    // Log audit event
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', matchingUser.id)
      .single();

    if (userData?.organization_id) {
      await supabase.rpc('log_audit_event', {
        p_organization_id: userData.organization_id,
        p_action: 'user_context_updated',
        p_resource_type: 'user',
        p_resource_id: user.id,
        p_details: { context_keys: Object.keys(userContext) }
      }).catch(err => console.error('Audit log error:', err));
    }

    return NextResponse.json(
      {
        ok: true,
        message: 'User context updated successfully'
      },
      { headers: corsHeaders(origin) }
    );

  } catch (err) {
    console.error('Error updating user context:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

