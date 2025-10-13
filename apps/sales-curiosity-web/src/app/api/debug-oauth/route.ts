import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'OAuth Debug Information',
    instructions: [
      '1. Check Vercel function logs at: https://vercel.com/[your-project]/logs',
      '2. Look for lines starting with "NextAuth Error Cause Details"',
      '3. The error will show the exact rejection reason from Microsoft',
    ],
    commonErrors: {
      'invalid_client': 'Client secret is wrong or expired. Generate new secret in Azure Portal.',
      'invalid_request': 'Redirect URI mismatch. Check Azure App Registration redirect URIs.',
      'unauthorized_client': 'Client not authorized. Check Azure App settings and permissions.',
      'access_denied': 'User denied consent or app not approved by tenant admin.',
    },
    checkList: [
      '✓ Redirect URIs in Azure match: https://www.curiosityengine.io/api/auth/callback/azure-ad',
      '✓ Client ID matches Azure App Application ID',
      '✓ Client Secret is valid and not expired',
      '✓ Azure App supports multi-tenant + personal accounts',
      '✓ ID tokens enabled in Azure App implicit grant settings',
    ],
    nextSteps: [
      '1. Copy the client secret VALUE (not ID) from Azure',
      '2. Make sure no extra spaces or characters when copying',
      '3. Update MICROSOFT_CLIENT_SECRET in Vercel',
      '4. Redeploy and try again',
    ]
  }, { status: 200 });
}

