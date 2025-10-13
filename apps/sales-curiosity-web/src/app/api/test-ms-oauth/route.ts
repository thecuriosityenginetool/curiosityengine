import { NextResponse } from 'next/server';

export async function GET() {
  const config = {
    hasMicrosoftClientId: !!process.env.MICROSOFT_CLIENT_ID,
    hasMicrosoftClientSecret: !!process.env.MICROSOFT_CLIENT_SECRET,
    hasMicrosoftTenantId: !!process.env.MICROSOFT_TENANT_ID,
    hasAzureAdTenantId: !!process.env.AZURE_AD_TENANT_ID,
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    hasNextPublicAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
    
    microsoftClientIdPrefix: process.env.MICROSOFT_CLIENT_ID?.substring(0, 8) + '...',
    microsoftTenantId: process.env.MICROSOFT_TENANT_ID,
    azureAdTenantId: process.env.AZURE_AD_TENANT_ID,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL,
    
    // Test if tenant IDs match
    tenantIdsMatch: process.env.MICROSOFT_TENANT_ID === process.env.AZURE_AD_TENANT_ID,
    
    // Expected redirect URIs
    expectedRedirectUris: [
      `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/azure-ad`,
      `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL}/api/outlook/user-callback`
    ]
  };

  return NextResponse.json({
    status: 'Microsoft OAuth Configuration Check',
    config,
    issues: [
      !config.hasMicrosoftClientId && '❌ Missing MICROSOFT_CLIENT_ID',
      !config.hasMicrosoftClientSecret && '❌ Missing MICROSOFT_CLIENT_SECRET',
      !config.hasMicrosoftTenantId && '❌ Missing MICROSOFT_TENANT_ID',
      !config.hasAzureAdTenantId && '❌ Missing AZURE_AD_TENANT_ID',
      !config.hasNextAuthUrl && '❌ Missing NEXTAUTH_URL',
      !config.hasNextAuthSecret && '❌ Missing NEXTAUTH_SECRET',
      !config.tenantIdsMatch && '⚠️ MICROSOFT_TENANT_ID and AZURE_AD_TENANT_ID do not match',
    ].filter(Boolean),
    recommendations: [
      'Ensure both redirect URIs are added to your Azure App Registration',
      'Verify the client secret is correct and not expired',
      'Check that the Azure App supports "Accounts in any organizational directory and personal Microsoft accounts"'
    ]
  }, { status: 200 });
}

