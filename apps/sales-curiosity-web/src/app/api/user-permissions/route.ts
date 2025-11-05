import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth';

function corsHeaders(origin?: string) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function isAllowedOrigin(origin: string | null) {
  if (!origin) return true;
  const allowed = [
    'chrome-extension://',
    process.env.NEXT_PUBLIC_APP_URL || '',
    'http://localhost:3000',
    'https://curiosityengine.io',
    'https://www.curiosityengine.io'
  ];
  return allowed.some((prefix) => origin.startsWith(prefix));
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// OPTIONS - Handle preflight requests
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return NextResponse.json({}, { status: 200, headers: corsHeaders(origin) });
}

// GET - Get user's permissions
export async function GET(req: NextRequest) {
  try {
    const origin = req.headers.get('origin');
    
    if (!isAllowedOrigin(origin)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: corsHeaders(origin) }
      );
    }

    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders(origin) });
    }

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('userId');

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id, organization_id, role')
      .eq('email', session.user.email)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404, headers: corsHeaders(origin) });
    }

    // If querying another user, check if requester has permission
    if (targetUserId && targetUserId !== user.id) {
      const { data: requesterPermissions } = await supabase
        .from('user_permissions')
        .select('can_manage_permissions')
        .eq('user_id', user.id)
        .eq('organization_id', user.organization_id)
        .maybeSingle();

      if (!requesterPermissions?.can_manage_permissions && user.role !== 'org_admin' && user.role !== 'super_admin') {
        return NextResponse.json({ 
          error: 'You do not have permission to view other users\' permissions' 
        }, { status: 403, headers: corsHeaders(origin) });
      }
    }

    const userId = targetUserId || user.id;

    // Get permissions
    const { data: permissions, error } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', user.organization_id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching permissions:', error);
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders(origin) });
    }

    return NextResponse.json({ permissions: permissions || {} }, { headers: corsHeaders(origin) });
  } catch (error) {
    console.error('Error in GET /api/user-permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders() });
  }
}

// PUT - Update user permissions
export async function PUT(req: NextRequest) {
  try {
    const origin = req.headers.get('origin');
    
    if (!isAllowedOrigin(origin)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: corsHeaders(origin) }
      );
    }

    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders(origin) });
    }

    const body = await req.json();
    const { userId, permissions } = body;

    if (!userId || !permissions) {
      return NextResponse.json(
        { error: 'userId and permissions are required' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Get requesting user
    const { data: user } = await supabase
      .from('users')
      .select('id, organization_id, role')
      .eq('email', session.user.email)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404, headers: corsHeaders(origin) });
    }

    // Check if user has permission to manage permissions
    const { data: userPermissions } = await supabase
      .from('user_permissions')
      .select('can_manage_permissions')
      .eq('user_id', user.id)
      .eq('organization_id', user.organization_id)
      .maybeSingle();

    if (!userPermissions?.can_manage_permissions && user.role !== 'org_admin' && user.role !== 'super_admin') {
      return NextResponse.json({ 
        error: 'You do not have permission to manage user permissions' 
      }, { status: 403, headers: corsHeaders(origin) });
    }

    // Verify target user is in same organization
    const { data: targetUser } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', userId)
      .maybeSingle();

    if (!targetUser || targetUser.organization_id !== user.organization_id) {
      return NextResponse.json({ 
        error: 'User not found in your organization' 
      }, { status: 404, headers: corsHeaders(origin) });
    }

    // Update permissions
    const { data: updatedPermissions, error: updateError } = await supabase
      .from('user_permissions')
      .update({
        ...permissions,
        granted_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('organization_id', user.organization_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating permissions:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500, headers: corsHeaders(origin) });
    }

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_organization_id: user.organization_id,
      p_action: 'permissions_updated',
      p_resource_type: 'user',
      p_resource_id: userId,
      p_details: { updated_permissions: Object.keys(permissions) }
    });

    return NextResponse.json({ 
      success: true,
      permissions: updatedPermissions
    }, { headers: corsHeaders(origin) });
  } catch (error) {
    console.error('Error in PUT /api/user-permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders() });
  }
}

