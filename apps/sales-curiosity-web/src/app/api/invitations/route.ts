import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth';
import { randomBytes } from 'crypto';

function corsHeaders(origin?: string) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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

// GET - Get invitations for organization
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

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id, organization_id, role')
      .eq('email', session.user.email)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404, headers: corsHeaders(origin) });
    }

    // Check permission
    const { data: permissions } = await supabase
      .from('user_permissions')
      .select('can_invite_users')
      .eq('user_id', user.id)
      .eq('organization_id', user.organization_id)
      .maybeSingle();

    if (!permissions?.can_invite_users && user.role !== 'org_admin' && user.role !== 'super_admin') {
      return NextResponse.json({ 
        error: 'You do not have permission to view invitations' 
      }, { status: 403, headers: corsHeaders(origin) });
    }

    // Get invitations
    const { data: invitations, error } = await supabase
      .from('user_invitations')
      .select(`
        *,
        inviter:users!user_invitations_invited_by_fkey(full_name, email)
      `)
      .eq('organization_id', user.organization_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders(origin) });
    }

    return NextResponse.json({ invitations: invitations || [] }, { headers: corsHeaders(origin) });
  } catch (error) {
    console.error('Error in GET /api/invitations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders() });
  }
}

// POST - Create invitation
export async function POST(req: NextRequest) {
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
    const { email, role, permissions: customPermissions, message } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Validate role - invited users can only be 'user' role
    if (!['user'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Invited users must have role: user' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id, organization_id, role')
      .eq('email', session.user.email)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404, headers: corsHeaders(origin) });
    }

    // Check permission
    const { data: userPermissions } = await supabase
      .from('user_permissions')
      .select('can_invite_users')
      .eq('user_id', user.id)
      .eq('organization_id', user.organization_id)
      .maybeSingle();

    if (!userPermissions?.can_invite_users && user.role !== 'org_admin' && user.role !== 'super_admin') {
      return NextResponse.json({ 
        error: 'You do not have permission to invite users' 
      }, { status: 403, headers: corsHeaders(origin) });
    }

    // Check if user is already in organization
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('organization_id', user.organization_id)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: 'User is already a member of this organization' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Check for existing pending invitation
    const { data: existingInvitation } = await supabase
      .from('user_invitations')
      .select('id, status')
      .eq('email', email)
      .eq('organization_id', user.organization_id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'An invitation for this email already exists' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Check seat limit
    const { data: organization } = await supabase
      .from('organizations')
      .select('max_seats')
      .eq('id', user.organization_id)
      .maybeSingle();

    const { count: currentMembers } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', user.organization_id);

    if (organization && currentMembers && currentMembers >= organization.max_seats) {
      return NextResponse.json(
        { error: `Organization has reached maximum seat limit (${organization.max_seats})` },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Generate invitation token
    const invitationToken = randomBytes(32).toString('hex');

    // Set default permissions for 'user' role (basic access)
    const defaultPermissions = customPermissions || {
      can_view_org_materials: true, // Can view shared materials
      can_upload_materials: true, // Can upload their own materials
      can_delete_own_materials: true, // Can delete their own
      can_share_materials: false, // Cannot share to org (users are basic)
      can_view_team_analyses: true, // Can see team activity
      can_view_team_emails: false, // Cannot see others' emails
      can_manage_integrations: false, // Cannot manage integrations
      can_invite_users: false, // Cannot invite others
      can_manage_permissions: false, // Cannot manage permissions
      can_delete_org_materials: false // Cannot delete org materials
    };

    // Create invitation (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: invitation, error: inviteError } = await supabase
      .from('user_invitations')
      .insert({
        organization_id: user.organization_id,
        email: email.toLowerCase(),
        role,
        invited_by: user.id,
        invitation_token: invitationToken,
        invitation_message: message || null,
        default_permissions: defaultPermissions,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating invitation:', inviteError);
      return NextResponse.json({ error: inviteError.message }, { status: 500, headers: corsHeaders(origin) });
    }

    // TODO: Send invitation email
    // For now, return the invitation link that can be shared manually
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invitation?token=${invitationToken}`;

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_organization_id: user.organization_id,
      p_action: 'user_invited',
      p_resource_type: 'invitation',
      p_resource_id: invitation.id,
      p_details: { email, role }
    });

    return NextResponse.json({ 
      success: true,
      invitation,
      invitationLink
    }, { headers: corsHeaders(origin) });
  } catch (error) {
    console.error('Error in POST /api/invitations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders() });
  }
}

// DELETE - Revoke invitation
export async function DELETE(req: NextRequest) {
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
    const invitationId = searchParams.get('id');

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID required' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id, organization_id, role')
      .eq('email', session.user.email)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404, headers: corsHeaders(origin) });
    }

    // Check permission
    const { data: permissions } = await supabase
      .from('user_permissions')
      .select('can_invite_users')
      .eq('user_id', user.id)
      .eq('organization_id', user.organization_id)
      .maybeSingle();

    if (!permissions?.can_invite_users && user.role !== 'org_admin' && user.role !== 'super_admin') {
      return NextResponse.json({ 
        error: 'You do not have permission to revoke invitations' 
      }, { status: 403, headers: corsHeaders(origin) });
    }

    // Update invitation status
    const { error } = await supabase
      .from('user_invitations')
      .update({ status: 'revoked' })
      .eq('id', invitationId)
      .eq('organization_id', user.organization_id);

    if (error) {
      console.error('Error revoking invitation:', error);
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders(origin) });
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders(origin) });
  } catch (error) {
    console.error('Error in DELETE /api/invitations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders() });
  }
}

