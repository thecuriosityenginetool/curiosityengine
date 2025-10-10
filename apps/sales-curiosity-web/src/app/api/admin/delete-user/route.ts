import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, organizationId } = body;

    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: 'User ID and organization ID are required' },
        { status: 400 }
      );
    }

    console.log('Deleting user:', userId);

    // Delete from public.users (will cascade to analyses/emails)
    const { error: deleteUserError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)
      .eq('organization_id', organizationId); // Safety check

    if (deleteUserError) {
      console.error('Failed to delete user from public.users:', deleteUserError);
      return NextResponse.json(
        { error: 'Failed to delete user: ' + deleteUserError.message },
        { status: 500 }
      );
    }

    // Delete from auth.users
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error('Failed to delete auth user:', deleteAuthError);
      // User deleted from public.users but not auth - this is OK
    }

    console.log('User deleted successfully');

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_organization_id: organizationId,
      p_action: 'user_deleted_by_admin',
      p_resource_type: 'user',
      p_resource_id: userId,
      p_details: {}
    }).then(() => {
      console.log('Audit log created');
    }).catch(err => {
      console.error('Audit log error (non-critical):', err);
    });

    return NextResponse.json({
      ok: true,
      message: 'User deleted successfully'
    });

  } catch (err) {
    console.error('Error deleting user:', err);
    return NextResponse.json(
      { error: 'Internal Server Error: ' + (err as Error).message },
      { status: 500 }
    );
  }
}

