import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
  if (!origin) return false;
  const allowed = [
    'chrome-extension://',
    process.env.NEXT_PUBLIC_APP_URL || '',
  ];
  return allowed.some((prefix) => origin.startsWith(prefix));
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return NextResponse.json({}, { status: 200, headers: corsHeaders(origin) });
}

// GET organization context
export async function GET(req: NextRequest) {
  try {
    const origin = req.headers.get('origin');
    
    if (!isAllowedOrigin(origin)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: corsHeaders(origin) }
      );
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders(origin) }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401, headers: corsHeaders(origin) }
      );
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404, headers: corsHeaders(origin) }
      );
    }

    // Get organization context
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('org_context')
      .eq('id', userData.organization_id)
      .single();

    if (orgError) {
      return NextResponse.json(
        { error: 'Failed to fetch organization context' },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        orgContext: orgData?.org_context || { aboutUs: '', objectives: '', valueProposition: '' }
      },
      { headers: corsHeaders(origin) }
    );

  } catch (err) {
    console.error('Error getting org context:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

// PUT/Update organization context (org admins only)
export async function PUT(req: NextRequest) {
  try {
    const origin = req.headers.get('origin');
    
    if (!isAllowedOrigin(origin)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: corsHeaders(origin) }
      );
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders(origin) }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401, headers: corsHeaders(origin) }
      );
    }

    // Get user's organization and verify admin role
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404, headers: corsHeaders(origin) }
      );
    }

    // Check if user is org admin
    if (!['org_admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Only organization admins can update organization context' },
        { status: 403, headers: corsHeaders(origin) }
      );
    }

    const body = await req.json();
    const { orgContext } = body;

    if (!orgContext || typeof orgContext !== 'object') {
      return NextResponse.json(
        { error: 'Invalid organization context provided' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Update organization context
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ org_context: orgContext })
      .eq('id', userData.organization_id);

    if (updateError) {
      console.error('Error updating org context:', updateError);
      return NextResponse.json(
        { error: 'Failed to update organization context' },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_organization_id: userData.organization_id,
      p_action: 'org_context_updated',
      p_resource_type: 'organization',
      p_resource_id: userData.organization_id,
      p_details: { context_keys: Object.keys(orgContext) }
    }).catch(err => console.error('Audit log error:', err));

    return NextResponse.json(
      {
        ok: true,
        message: 'Organization context updated successfully'
      },
      { headers: corsHeaders(origin) }
    );

  } catch (err) {
    console.error('Error updating org context:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
