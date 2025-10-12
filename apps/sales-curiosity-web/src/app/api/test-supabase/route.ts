import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({
        error: 'Missing environment variables',
        hasUrl: !!supabaseUrl,
        hasKey: !!serviceRoleKey,
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Test query
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      return NextResponse.json({
        error: 'Supabase query failed',
        details: error.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase connection working!',
      userCount: data?.length || 0,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Exception',
      message: error.message,
    }, { status: 500 });
  }
}

