import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function OPTIONS() {
  return NextResponse.json({}, { 
    status: 200, 
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, action } = body;

    if (!email || !password || !action) {
      return NextResponse.json(
        { error: 'Email, password, and action are required' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    if (action === 'login') {
      // Login user
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { 
            status: 401,
            headers: {
              'Access-Control-Allow-Origin': '*',
            }
          }
        );
      }

      return NextResponse.json({
        success: true,
        user: data.user,
        session: data.session,
        accessToken: data.session?.access_token,
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      });

    } else if (action === 'signup') {
      // Sign up user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://curiosityengine.io'}/dashboard`,
        },
      });

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { 
            status: 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
            }
          }
        );
      }

      return NextResponse.json({
        success: true,
        user: data.user,
        session: data.session,
        accessToken: data.session?.access_token,
        message: data.user && !data.session ? 'Check your email to confirm your account' : 'Account created successfully',
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "login" or "signup"' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

  } catch (error) {
    console.error('Error in extension auth:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
}
