import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, newPassword, organizationId } = body;

    if (!userId || !newPassword || !organizationId) {
      return NextResponse.json(
        { error: 'User ID, password, and organization ID are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    console.log('Resetting password for user:', userId);

    // Update user's password using admin API
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (error) {
      console.error('Password reset error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.log('Password reset successfully');

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_organization_id: organizationId,
      p_action: 'password_reset_by_admin',
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
      message: 'Password reset successfully'
    });

  } catch (err) {
    console.error('Error resetting password:', err);
    return NextResponse.json(
      { error: 'Internal Server Error: ' + (err as Error).message },
      { status: 500 }
    );
  }
}

