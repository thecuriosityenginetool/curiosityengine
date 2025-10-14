import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        nextAuthSecretLength: process.env.NEXTAUTH_SECRET?.length || 0,
        hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
        nextAuthUrl: process.env.NEXTAUTH_URL,
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        hasMicrosoftClientId: !!process.env.MICROSOFT_CLIENT_ID,
        hasMicrosoftClientSecret: !!process.env.MICROSOFT_CLIENT_SECRET,
        hasAzureTenantId: !!process.env.AZURE_AD_TENANT_ID,
        azureTenantId: process.env.AZURE_AD_TENANT_ID || 'common',
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      tests: {}
    };

    // Test 1: NextAuth Import
    try {
      const { auth } = await import('@/lib/auth');
      diagnostics.tests.nextAuthImport = { status: 'success', message: 'NextAuth imported successfully' };
    } catch (error) {
      diagnostics.tests.nextAuthImport = { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'unknown error',
        stack: error instanceof Error ? error.stack : undefined
      };
    }

    // Test 2: Supabase Connection
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      
      if (supabaseUrl && serviceRoleKey) {
        const supabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        });
        
        const { data, error } = await supabase
          .from('users')
          .select('count')
          .limit(1);
          
        if (error) {
          diagnostics.tests.supabaseConnection = { 
            status: 'error', 
            message: 'Supabase query failed',
            error: error.message,
            details: error
          };
        } else {
          diagnostics.tests.supabaseConnection = { 
            status: 'success', 
            message: 'Supabase connection successful' 
          };
        }
      } else {
        diagnostics.tests.supabaseConnection = { 
          status: 'warning', 
          message: 'Supabase credentials not configured' 
        };
      }
    } catch (error) {
      diagnostics.tests.supabaseConnection = { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'unknown error',
        stack: error instanceof Error ? error.stack : undefined
      };
    }

    // Test 3: OAuth Table Exists
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      
      if (supabaseUrl && serviceRoleKey) {
        const supabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        });
        
        const { data, error } = await supabase
          .from('user_oauth_tokens')
          .select('count')
          .limit(1);
          
        if (error) {
          diagnostics.tests.oauthTableExists = { 
            status: 'error', 
            message: 'user_oauth_tokens table query failed',
            error: error.message,
            details: error
          };
        } else {
          diagnostics.tests.oauthTableExists = { 
            status: 'success', 
            message: 'user_oauth_tokens table exists and accessible' 
          };
        }
      } else {
        diagnostics.tests.oauthTableExists = { 
          status: 'warning', 
          message: 'Cannot test - Supabase credentials not configured' 
        };
      }
    } catch (error) {
      diagnostics.tests.oauthTableExists = { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'unknown error',
        stack: error instanceof Error ? error.stack : undefined
      };
    }

    return NextResponse.json(diagnostics);
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
