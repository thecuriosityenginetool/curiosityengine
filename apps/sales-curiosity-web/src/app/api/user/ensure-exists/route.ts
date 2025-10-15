import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🆕 Ensuring user exists for:', session.user.email);

    // Check if user exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .maybeSingle();

    if (existing) {
      console.log('✅ User already exists');
      return NextResponse.json({ ok: true, created: false });
    }

    // Create user with generated UUID
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        email: session.user.email,
        full_name: session.user.name || session.user.email?.split('@')[0] || 'User',
        role: 'member',
        user_context: { aboutMe: '', objectives: '' }
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating user:', insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    console.log('✅ User created:', newUser.email);

    return NextResponse.json({
      ok: true,
      created: true,
      user: newUser
    });

  } catch (error) {
    console.error('Error in ensure-exists:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

