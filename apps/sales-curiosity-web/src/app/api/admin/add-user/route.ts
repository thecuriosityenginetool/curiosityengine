import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  try {
    const body = await req.json();
    const { email, password, fullName, role, organizationId, createdBy } = body;

    if (!email || !password || !fullName || !role || !organizationId) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    console.log('Creating user:', email, 'for org:', organizationId);

    // Create user with Supabase auth using service role
    // Use skip_confirmation flag to prevent trigger from creating a new org
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        skip_org_creation: true, // Signal to trigger to skip org creation
      },
    });

    if (authError || !authData.user) {
      console.error('Auth creation error:', authError);
      return NextResponse.json(
        { error: authError?.message || 'Failed to create auth user' },
        { status: 400 }
      );
    }

    console.log('Auth user created:', authData.user.id);

    // Wait for trigger to create the user record (or we'll do it manually)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Check if user was created by trigger
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', authData.user.id)
      .single();

    if (existingUser) {
      console.log('User record exists from trigger, updating...');
      // Update user to join THIS organization (using service role to bypass RLS)
      const { error: updateError } = await supabase
        .from('users')
        .update({
          organization_id: organizationId,
          role: role,
          full_name: fullName,
        })
        .eq('id', authData.user.id);

      if (updateError) {
        console.error('Failed to link user to org:', updateError);
        return NextResponse.json(
          { error: 'User created but failed to link to organization: ' + updateError.message },
          { status: 500 }
        );
      }
    } else {
      console.log('User record not created by trigger, creating manually...');
      // Manually create user record linked to organization
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: email,
          full_name: fullName,
          organization_id: organizationId,
          role: role,
          is_active: true,
        });

      if (insertError) {
        console.error('Failed to create user record:', insertError);
        return NextResponse.json(
          { error: 'User auth created but failed to create user record: ' + insertError.message },
          { status: 500 }
        );
      }
    }

    console.log('User linked to organization successfully');

    // Log audit event (don't await - fire and forget)
    supabase.rpc('log_audit_event', {
      p_organization_id: organizationId,
      p_action: 'user_created_by_admin',
      p_resource_type: 'user',
      p_resource_id: authData.user.id,
      p_details: { email, role, created_by: createdBy }
    }).then(() => {
      console.log('Audit log created');
    }).catch(err => {
      console.error('Audit log error (non-critical):', err);
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name: fullName,
        role: role,
      },
      message: 'User created and added to organization successfully'
    });

  } catch (err) {
    console.error('Error creating user:', err);
    return NextResponse.json(
      { error: 'Internal Server Error: ' + (err as Error).message },
      { status: 500 }
    );
  }
}

