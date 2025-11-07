/**
 * Gmail Integration Service
 * Handles OAuth, API calls, and email operations
 */

import { createClient } from '@supabase/supabase-js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/gmail/user-callback`;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface GmailTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

/**
 * Generate Gmail OAuth URL
 */
export function getGmailAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<GmailTokens> {
  const params = new URLSearchParams({
    code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri: GOOGLE_REDIRECT_URI,
    grant_type: 'authorization_code',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gmail token exchange failed: ${error}`);
  }

  return await response.json();
}

/**
 * Refresh Gmail access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<GmailTokens> {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gmail token refresh failed: ${error}`);
  }

  return await response.json();
}

/**
 * Get Gmail tokens for a specific user
 */
export async function getUserGmailTokens(userId: string, organizationId: string): Promise<GmailTokens | null> {
  const { data, error } = await supabase
    .from('organization_integrations')
    .select('configuration')
    .eq('organization_id', organizationId)
    .eq('integration_type', 'gmail_user')
    .eq('is_enabled', true)
    .single();

  if (error || !data) {
    return null;
  }

  const config = data.configuration as any;
  return config[userId] || null;
}

/**
 * Make authenticated Gmail API request with automatic token refresh
 */
async function gmailApiRequest(
  organizationId: string,
  endpoint: string,
  options: RequestInit = {},
  userId: string
): Promise<any> {
  let tokens = await getUserGmailTokens(userId, organizationId);
  
  if (!tokens) {
    throw new Error('Gmail integration not configured');
  }

  const makeRequest = async (accessToken: string) => {
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1${endpoint}`, {
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
    console.log('Gmail access token expired, refreshing...');
    
    try {
      const newTokens = await refreshAccessToken(tokens.refresh_token);
      
      // Update tokens in database
      const { data: existing } = await supabase
        .from('organization_integrations')
        .select('id, configuration')
        .eq('organization_id', organizationId)
        .eq('integration_type', 'gmail_user')
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
      console.error('Gmail token refresh failed:', refreshError);
      throw new Error('Gmail authentication failed. Please reconnect your account.');
    }
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gmail API error: ${error}`);
  }

  return await response.json();
}

/**
 * Create email message in RFC 2822 format and encode to base64url
 */
function createEmailMessage(to: string, subject: string, body: string, from?: string): string {
  const messageParts = [
    from ? `From: ${from}` : '',
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    body
  ].filter(Boolean);

  const message = messageParts.join('\r\n');
  // Use base64url encoding (replace + with -, / with _, remove padding =)
  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Create a draft email in Gmail
 */
export async function createGmailDraft(
  organizationId: string,
  emailData: {
    to: string;
    subject: string;
    body: string;
  },
  userId: string
): Promise<{ id: string; success: boolean }> {
  try {
    const encodedMessage = createEmailMessage(emailData.to, emailData.subject, emailData.body);

    const result = await gmailApiRequest(
      organizationId,
      '/users/me/drafts',
      {
        method: 'POST',
        body: JSON.stringify({
          message: {
            raw: encodedMessage
          }
        }),
      },
      userId
    );

    return { id: result.id, success: true };
  } catch (error) {
    console.error('Error creating Gmail draft:', error);
    throw error;
  }
}

/**
 * Send an email via Gmail
 */
export async function sendGmailEmail(
  organizationId: string,
  emailData: {
    to: string;
    subject: string;
    body: string;
  },
  userId: string
): Promise<{ id: string; success: boolean }> {
  try {
    const encodedMessage = createEmailMessage(emailData.to, emailData.subject, emailData.body);

    const result = await gmailApiRequest(
      organizationId,
      '/users/me/messages/send',
      {
        method: 'POST',
        body: JSON.stringify({
          raw: encodedMessage
        }),
      },
      userId
    );

    return { id: result.id, success: true };
  } catch (error) {
    console.error('Error sending Gmail email:', error);
    throw error;
  }
}

/**
 * Get user's Gmail profile
 */
export async function getGmailProfile(
  organizationId: string,
  userId: string
): Promise<{ emailAddress: string; messagesTotal: number }> {
  try {
    const result = await gmailApiRequest(
      organizationId,
      '/users/me/profile',
      {},
      userId
    );

    return {
      emailAddress: result.emailAddress,
      messagesTotal: result.messagesTotal
    };
  } catch (error) {
    console.error('Error getting Gmail profile:', error);
    throw error;
  }
}

/**
 * Make authenticated Google Calendar API request with automatic token refresh
 */
async function calendarApiRequest(
  organizationId: string,
  endpoint: string,
  options: RequestInit = {},
  userId: string
): Promise<any> {
  let tokens = await getUserGmailTokens(userId, organizationId);
  
  if (!tokens) {
    throw new Error('Google Calendar integration not configured');
  }

  const makeRequest = async (accessToken: string) => {
    const response = await fetch(`https://www.googleapis.com/calendar/v3${endpoint}`, {
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
  if (response.status === 401) {
    console.log('Google Calendar access token expired, refreshing...');
    
    try {
      const newTokens = await refreshAccessToken(tokens.refresh_token);
      
      // Update tokens in database
      const { data: existing } = await supabase
        .from('organization_integrations')
        .select('id, configuration')
        .eq('organization_id', organizationId)
        .eq('integration_type', 'gmail_user')
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
      console.error('Google Calendar token refresh failed:', refreshError);
      throw new Error('Google Calendar authentication failed. Please reconnect your account.');
    }
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Calendar API error: ${error}`);
  }

  return await response.json();
}

/**
 * Get Google Calendar events
 */
export async function getGoogleCalendarEvents(
  organizationId: string,
  userId: string,
  options?: {
    startDate?: string; // ISO 8601 format
    endDate?: string;   // ISO 8601 format
    maxResults?: number;
  }
): Promise<any[]> {
  try {
    const startDate = options?.startDate || new Date().toISOString();
    const endDate = options?.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const maxResults = options?.maxResults || 50;

    // Build query parameters
    const params = new URLSearchParams({
      timeMin: startDate,
      timeMax: endDate,
      maxResults: maxResults.toString(),
      singleEvents: 'true',
      orderBy: 'startTime'
    });

    const result = await calendarApiRequest(
      organizationId,
      `/calendars/primary/events?${params.toString()}`,
      {},
      userId
    );

    return result.items || [];
  } catch (error) {
    console.error('Error fetching Google Calendar events:', error);
    throw error;
  }
}

/**
 * Create a calendar event in Google Calendar
 */
export async function createGoogleCalendarEvent(
  organizationId: string,
  eventData: {
    summary: string;
    start: string; // ISO 8601
    end: string;   // ISO 8601
    description?: string;
    location?: string;
    attendees?: string[];
  },
  userId: string
): Promise<{ id: string; success: boolean }> {
  try {
    const event = {
      summary: eventData.summary,
      description: eventData.description || '',
      location: eventData.location || '',
      start: {
        dateTime: eventData.start,
        timeZone: 'UTC'
      },
      end: {
        dateTime: eventData.end,
        timeZone: 'UTC'
      },
      attendees: eventData.attendees?.map(email => ({ email })) || [],
      reminders: {
        useDefault: true
      }
    };

    const result = await calendarApiRequest(
      organizationId,
      '/calendars/primary/events',
      {
        method: 'POST',
        body: JSON.stringify(event),
      },
      userId
    );

    return { id: result.id, success: true };
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    throw error;
  }
}

