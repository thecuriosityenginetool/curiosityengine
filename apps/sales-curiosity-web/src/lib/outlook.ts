/**
 * Outlook/Microsoft Integration Service
 * Handles OAuth, API calls, and email operations via Microsoft Graph
 */

import { createClient } from '@supabase/supabase-js';

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || '';
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || '';
const MICROSOFT_REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/outlook/user-callback`;
const MICROSOFT_TENANT_ID = process.env.MICROSOFT_TENANT_ID || 'common';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface OutlookTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

/**
 * Generate Outlook OAuth URL
 */
export function getOutlookAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    response_type: 'code',
    redirect_uri: MICROSOFT_REDIRECT_URI,
    response_mode: 'query',
    scope: 'openid offline_access Mail.Send Mail.ReadWrite User.Read',
    state,
  });

  return `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<OutlookTokens> {
  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    client_secret: MICROSOFT_CLIENT_SECRET,
    code,
    redirect_uri: MICROSOFT_REDIRECT_URI,
    grant_type: 'authorization_code',
  });

  const response = await fetch(`https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Outlook token exchange failed: ${error}`);
  }

  return await response.json();
}

/**
 * Refresh Outlook access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<OutlookTokens> {
  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    client_secret: MICROSOFT_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch(`https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Outlook token refresh failed: ${error}`);
  }

  return await response.json();
}

/**
 * Get Outlook tokens for a specific user
 */
export async function getUserOutlookTokens(userId: string, organizationId: string): Promise<OutlookTokens | null> {
  const { data, error } = await supabase
    .from('organization_integrations')
    .select('configuration')
    .eq('organization_id', organizationId)
    .eq('integration_type', 'outlook_user')
    .eq('is_enabled', true)
    .single();

  if (error || !data) {
    return null;
  }

  const config = data.configuration as any;
  return config[userId] || null;
}

/**
 * Make authenticated Microsoft Graph API request with automatic token refresh
 */
async function graphApiRequest(
  organizationId: string,
  endpoint: string,
  options: RequestInit = {},
  userId: string
): Promise<any> {
  let tokens = await getUserOutlookTokens(userId, organizationId);
  
  if (!tokens) {
    throw new Error('Outlook integration not configured');
  }

  const makeRequest = async (accessToken: string) => {
    const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    return response;
  };

  // Try with current access token
  let response = await makeRequest(tokens.access_token);

  // If unauthorized, try refreshing the token
  if (response.status === 401 && tokens.refresh_token) {
    console.log('Outlook access token expired, refreshing...');
    
    try {
      const newTokens = await refreshAccessToken(tokens.refresh_token);
      
      // Update tokens in database
      const { data: existing } = await supabase
        .from('organization_integrations')
        .select('id, configuration')
        .eq('organization_id', organizationId)
        .eq('integration_type', 'outlook_user')
        .single();

      if (existing) {
        const existingConfig = existing.configuration as any || {};
        const mergedConfig = {
          ...existingConfig,
          [userId]: newTokens
        };

        await supabase
          .from('organization_integrations')
          .update({
            configuration: mergedConfig,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      }

      // Retry request with new token
      response = await makeRequest(newTokens.access_token);
      tokens = newTokens;
    } catch (refreshError) {
      console.error('Outlook token refresh failed:', refreshError);
      throw new Error('Outlook authentication failed. Please reconnect your account.');
    }
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Microsoft Graph API error: ${error}`);
  }

  return await response.json();
}

/**
 * Create a draft email in Outlook
 */
export async function createOutlookDraft(
  organizationId: string,
  emailData: {
    to: string;
    subject: string;
    body: string;
  },
  userId: string
): Promise<{ id: string; success: boolean }> {
  try {
    const messagePayload = {
      subject: emailData.subject,
      body: {
        contentType: 'HTML',
        content: emailData.body
      },
      toRecipients: [
        {
          emailAddress: {
            address: emailData.to
          }
        }
      ]
    };

    const result = await graphApiRequest(
      organizationId,
      '/me/messages',
      {
        method: 'POST',
        body: JSON.stringify(messagePayload),
      },
      userId
    );

    return { id: result.id, success: true };
  } catch (error) {
    console.error('Error creating Outlook draft:', error);
    throw error;
  }
}

/**
 * Send an email via Outlook
 */
export async function sendOutlookEmail(
  organizationId: string,
  emailData: {
    to: string;
    subject: string;
    body: string;
  },
  userId: string
): Promise<{ success: boolean }> {
  try {
    const messagePayload = {
      message: {
        subject: emailData.subject,
        body: {
          contentType: 'HTML',
          content: emailData.body
        },
        toRecipients: [
          {
            emailAddress: {
              address: emailData.to
            }
          }
        ]
      },
      saveToSentItems: true
    };

    await graphApiRequest(
      organizationId,
      '/me/sendMail',
      {
        method: 'POST',
        body: JSON.stringify(messagePayload),
      },
      userId
    );

    return { success: true };
  } catch (error) {
    console.error('Error sending Outlook email:', error);
    throw error;
  }
}

/**
 * Get user's Outlook profile
 */
export async function getOutlookProfile(
  organizationId: string,
  userId: string
): Promise<{ displayName: string; mail: string; userPrincipalName: string }> {
  try {
    const result = await graphApiRequest(
      organizationId,
      '/me',
      {},
      userId
    );

    return {
      displayName: result.displayName,
      mail: result.mail,
      userPrincipalName: result.userPrincipalName
    };
  } catch (error) {
    console.error('Error getting Outlook profile:', error);
    throw error;
  }
}

