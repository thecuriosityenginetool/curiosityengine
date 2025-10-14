import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Test basic NextAuth configuration
    const config = {
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      nextAuthSecretLength: process.env.NEXTAUTH_SECRET?.length || 0,
      nextAuthSecretPrefix: process.env.NEXTAUTH_SECRET?.substring(0, 8) + '...',
      hasMicrosoftClientId: !!process.env.MICROSOFT_CLIENT_ID,
      hasMicrosoftClientSecret: !!process.env.MICROSOFT_CLIENT_SECRET,
      hasAzureTenantId: !!process.env.AZURE_AD_TENANT_ID,
      azureTenantId: process.env.AZURE_AD_TENANT_ID || 'common',
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      nextAuthUrl: process.env.NEXTAUTH_URL,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    };

    // Test if we can import NextAuth without errors
    let nextAuthStatus = 'unknown';
    try {
      const { auth } = await import('@/lib/auth');
      nextAuthStatus = 'success';
    } catch (error) {
      nextAuthStatus = `error: ${error instanceof Error ? error.message : 'unknown'}`;
    }

    return NextResponse.json({
      status: 'NextAuth Configuration Test',
      config,
      nextAuthImport: nextAuthStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
