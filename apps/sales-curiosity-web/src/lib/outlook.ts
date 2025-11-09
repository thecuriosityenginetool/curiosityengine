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
    scope: 'openid offline_access Mail.Send Mail.ReadWrite User.Read Calendars.Read Calendars.ReadWrite',
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
    .eq('integration_type', 'outlook') // Use 'outlook' instead of 'outlook_user'
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
        .eq('integration_type', 'outlook') // Use 'outlook' instead of 'outlook_user'
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
    console.error('❌ Microsoft Graph API error:', {
      status: response.status,
      statusText: response.statusText,
      error: error
    });
    throw new Error(`Microsoft Graph API error (${response.status}): ${error}`);
  }

  const result = await response.json();
  console.log('🔵 Microsoft Graph API success:', { 
    status: response.status,
    hasResult: !!result,
    resultKeys: result ? Object.keys(result) : []
  });
  return result;
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
    console.log('🔵 Creating Outlook draft:', { to: emailData.to, subject: emailData.subject });
    
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

    // Use the correct endpoint for drafts - POST to /me/messages without sending
    console.log('🔵 Sending request to Microsoft Graph API...');
    const result = await graphApiRequest(
      organizationId,
      '/me/messages',
      {
        method: 'POST',
        body: JSON.stringify(messagePayload),
      },
      userId
    );

    console.log('🔵 Graph API response:', { 
      id: result.id, 
      subject: result.subject,
      isDraft: result.isDraft,
      hasAttachments: result.hasAttachments,
      createdDateTime: result.createdDateTime,
      bodyPreview: result.bodyPreview?.substring(0, 100)
    });

    // Check if it was created as a draft
    if (result.isDraft) {
      console.log('✅ Outlook draft created successfully in Drafts folder');
    } else {
      console.log('⚠️ Message created but may not be in Drafts folder');
    }

    return { id: result.id, success: true };
  } catch (error) {
    console.error('❌ Error creating Outlook draft:', error);
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

/**
 * Get calendar events from Outlook
 */
export async function getOutlookCalendarEvents(
  organizationId: string,
  userId: string,
  options?: {
    startDate?: string; // ISO 8601 format
    endDate?: string;   // ISO 8601 format
    top?: number;       // Max number of events
  }
): Promise<any[]> {
  try {
    const startDate = options?.startDate || new Date().toISOString();
    const endDate = options?.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now
    const top = options?.top || 50;

    // Build query parameters for calendar view
    const params = new URLSearchParams({
      startDateTime: startDate,
      endDateTime: endDate,
      $top: top.toString(),
      $orderby: 'start/dateTime'
    });

    const result = await graphApiRequest(
      organizationId,
      `/me/calendarview?${params.toString()}`,
      {},
      userId
    );

    return result.value || [];
  } catch (error) {
    console.error('Error fetching Outlook calendar events:', error);
    throw error;
  }
}

/**
 * Create a calendar event in Outlook
 */
export async function createOutlookCalendarEvent(
  organizationId: string,
  eventData: {
    subject: string;
    start: string; // ISO 8601
    end: string;   // ISO 8601
    body?: string;
    attendees?: string[]; // Email addresses
    location?: string;
  },
  userId: string
): Promise<{ id: string; success: boolean }> {
  try {
    // Get user's timezone (default to America/New_York if not available)
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
    
    const eventPayload = {
      subject: eventData.subject,
      start: {
        dateTime: eventData.start,
        timeZone: userTimeZone // Use user's actual timezone, not UTC
      },
      end: {
        dateTime: eventData.end,
        timeZone: userTimeZone // Use user's actual timezone, not UTC
      },
      body: eventData.body ? {
        contentType: 'HTML',
        content: eventData.body
      } : undefined,
      attendees: eventData.attendees?.map(email => ({
        emailAddress: {
          address: email
        },
        type: 'required'
      })),
      location: eventData.location ? {
        displayName: eventData.location
      } : undefined
    };

    const result = await graphApiRequest(
      organizationId,
      '/me/events',
      {
        method: 'POST',
        body: JSON.stringify(eventPayload),
      },
      userId
    );

    return { id: result.id, success: true };
  } catch (error) {
    console.error('Error creating Outlook calendar event:', error);
    throw error;
  }
}

/**
 * Get recent emails from Outlook
 */
export async function getRecentEmails(
  organizationId: string,
  userId: string,
  limit: number = 10
): Promise<any[]> {
  try {
    console.log('📧 Fetching recent emails from Outlook...');
    
    const params = new URLSearchParams({
      '$top': limit.toString(),
      '$select': 'subject,from,receivedDateTime,bodyPreview,toRecipients,isRead',
      '$orderby': 'receivedDateTime desc'
    });

    const result = await graphApiRequest(
      organizationId,
      `/me/messages?${params.toString()}`,
      {},
      userId
    );

    console.log('✅ Fetched', result.value?.length || 0, 'recent emails');
    return result.value || [];
  } catch (error) {
    console.error('Error fetching recent emails:', error);
    throw error;
  }
}

/**
 * Search emails in Outlook
 */
export async function searchEmails(
  organizationId: string,
  query: string,
  userId: string,
  limit: number = 5
): Promise<any[]> {
  try {
    console.log('🔍 Searching emails for:', query);
    
    const params = new URLSearchParams({
      '$search': `"${query}"`,
      '$top': limit.toString(),
      '$select': 'subject,from,receivedDateTime,bodyPreview,toRecipients',
      '$orderby': 'receivedDateTime desc'
    });

    const result = await graphApiRequest(
      organizationId,
      `/me/messages?${params.toString()}`,
      {},
      userId
    );

    console.log('✅ Found', result.value?.length || 0, 'emails matching query');
    return result.value || [];
  } catch (error) {
    console.error('Error searching emails:', error);
    throw error;
  }
}

