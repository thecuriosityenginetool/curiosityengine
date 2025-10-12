import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const hasSecret = !!process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.AZURE_AD_TENANT_ID || 'common';
  
  return NextResponse.json({
    hasClientId: !!clientId,
    clientIdLength: clientId?.length,
    clientIdPrefix: clientId?.substring(0, 8) + '...',
    clientIdFormat: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId || ''),
    hasSecret: hasSecret,
    secretLength: process.env.MICROSOFT_CLIENT_SECRET?.length,
    tenantId: tenantId,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    expectedRedirectUri: `${process.env.NEXTAUTH_URL}/api/auth/callback/azure-ad`,
  });
}

