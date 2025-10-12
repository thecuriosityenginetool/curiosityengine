import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasGoogleId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasMicrosoftId: !!process.env.MICROSOFT_CLIENT_ID,
    hasMicrosoftSecret: !!process.env.MICROSOFT_CLIENT_SECRET,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    googleIdPrefix: process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...',
    microsoftIdPrefix: process.env.MICROSOFT_CLIENT_ID?.substring(0, 20) + '...',
  });
}

