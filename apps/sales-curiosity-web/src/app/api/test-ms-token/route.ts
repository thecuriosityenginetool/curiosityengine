import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // This endpoint tests if we can get a token from Microsoft
  // It will show the actual error from Microsoft's token endpoint
  
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.AZURE_AD_TENANT_ID || 'common';
  
  if (!clientId || !clientSecret) {
    return NextResponse.json({
      error: 'Missing credentials',
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret
    }, { status: 500 });
  }

  // Test the well-known endpoint
  try {
    const wellKnownUrl = `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`;
    const wellKnownResponse = await fetch(wellKnownUrl);
    const wellKnownData = await wellKnownResponse.json();
    
    return NextResponse.json({
      status: 'Microsoft OAuth Configuration Test',
      wellKnownEndpoint: wellKnownUrl,
      wellKnownStatus: wellKnownResponse.ok ? 'OK' : 'Failed',
      wellKnownData: wellKnownResponse.ok ? {
        authorization_endpoint: wellKnownData.authorization_endpoint,
        token_endpoint: wellKnownData.token_endpoint,
        issuer: wellKnownData.issuer
      } : wellKnownData,
      clientIdPrefix: clientId.substring(0, 8) + '...',
      tenantId,
      note: 'If well-known endpoint fails, check if AZURE_AD_TENANT_ID is correct'
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch well-known endpoint',
      message: error instanceof Error ? error.message : 'Unknown error',
      tenantId,
      wellKnownUrl: `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`
    }, { status: 500 });
  }
}

