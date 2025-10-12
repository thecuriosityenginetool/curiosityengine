import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  bodyType?: 'plain' | 'html';
}

// Helper to refresh access token if expired
async function refreshAccessToken(userId: string, provider: string, refreshToken: string) {
  try {
    if (provider === 'google') {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      const data = await response.json();
      
      if (data.access_token) {
        // Update the access token in database
        await supabase
          .from('user_oauth_tokens')
          .update({
            access_token: data.access_token,
            token_expiry: new Date(Date.now() + data.expires_in * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('provider', provider);

        return data.access_token;
      }
    } else if (provider === 'microsoft') {
      const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          scope: 'https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/Mail.ReadWrite',
        }),
      });

      const data = await response.json();
      
      if (data.access_token) {
        await supabase
          .from('user_oauth_tokens')
          .update({
            access_token: data.access_token,
            token_expiry: new Date(Date.now() + data.expires_in * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('provider', provider);

        return data.access_token;
      }
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
  }
  return null;
}

// Send email via Gmail API
async function sendViaGmail(accessToken: string, email: EmailRequest) {
  const message = [
    `To: ${email.to}`,
    `Subject: ${email.subject}`,
    'MIME-Version: 1.0',
    email.bodyType === 'html' 
      ? 'Content-Type: text/html; charset=utf-8'
      : 'Content-Type: text/plain; charset=utf-8',
    '',
    email.body,
  ].join('\n');

  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedMessage }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gmail API error: ${JSON.stringify(error)}`);
  }

  return await response.json();
}

// Send email via Microsoft Graph API
async function sendViaOutlook(accessToken: string, email: EmailRequest) {
  const message = {
    message: {
      subject: email.subject,
      body: {
        contentType: email.bodyType === 'html' ? 'HTML' : 'Text',
        content: email.body,
      },
      toRecipients: [
        {
          emailAddress: {
            address: email.to,
          },
        },
      ],
    },
  };

  const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Outlook API error: ${JSON.stringify(error)}`);
  }

  // Microsoft Graph API returns 202 Accepted with no body
  return { success: true };
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const email: EmailRequest = await req.json();

    // Validate email request
    if (!email.to || !email.subject || !email.body) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, body' },
        { status: 400 }
      );
    }

    // Get user's OAuth tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('user_oauth_tokens')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (tokenError || !tokens) {
      return NextResponse.json(
        { error: 'No email provider connected. Please sign in again.' },
        { status: 400 }
      );
    }

    let accessToken = tokens.access_token;

    // Check if token is expired and refresh if needed
    if (tokens.token_expiry && new Date(tokens.token_expiry) < new Date()) {
      console.log('Token expired, refreshing...');
      if (tokens.refresh_token) {
        const newToken = await refreshAccessToken(userId, tokens.provider, tokens.refresh_token);
        if (newToken) {
          accessToken = newToken;
        } else {
          return NextResponse.json(
            { error: 'Failed to refresh access token. Please sign in again.' },
            { status: 401 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'No refresh token available. Please sign in again.' },
          { status: 401 }
        );
      }
    }

    // Send email via appropriate provider
    let result;
    if (tokens.provider === 'google') {
      result = await sendViaGmail(accessToken, email);
    } else if (tokens.provider === 'microsoft') {
      result = await sendViaOutlook(accessToken, email);
    } else {
      return NextResponse.json(
        { error: 'Unknown email provider' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      provider: tokens.provider,
      result,
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

