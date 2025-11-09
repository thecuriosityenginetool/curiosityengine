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
    scope: 'https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.settings.basic https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function looksLikeHtml(content: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(content);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function convertToHtml(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) {
    return '';
  }

  if (looksLikeHtml(trimmed)) {
    return trimmed;
  }

  const paragraphs = trimmed.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
  if (paragraphs.length === 0) {
    return '';
  }

  return paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function appendSignature(bodyHtml: string, signatureHtml?: string | null): string {
  if (!signatureHtml) {
    return bodyHtml;
  }

  const trimmedSignature = signatureHtml.trim();
  if (!trimmedSignature) {
    return bodyHtml;
  }

  if (bodyHtml.includes(trimmedSignature)) {
    return bodyHtml;
  }

  const separator = bodyHtml.trim().length > 0 ? '<br><br>' : '';
  return `${bodyHtml}${separator}${trimmedSignature}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<GmailTokens> {
  console.log('🟩 [Gmail] Starting token exchange...');
  console.log('🟩 [Gmail] Config check:', {
    hasClientId: !!GOOGLE_CLIENT_ID,
    hasClientSecret: !!GOOGLE_CLIENT_SECRET,
    hasRedirectUri: !!GOOGLE_REDIRECT_URI,
    redirectUri: GOOGLE_REDIRECT_URI
  });

  const params = new URLSearchParams({
    code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri: GOOGLE_REDIRECT_URI,
    grant_type: 'authorization_code',
  });

  console.log('🟩 [Gmail] Making token request to Google...');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  console.log('🟩 [Gmail] Token response status:', response.status);

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ [Gmail] Token exchange failed:', error);
    throw new Error(`Gmail token exchange failed: ${error}`);
  }

  const tokens = await response.json();
  console.log('✅ [Gmail] Tokens received successfully:', {
    hasAccessToken: !!tokens.access_token,
    hasRefreshToken: !!tokens.refresh_token,
    expiresIn: tokens.expires_in,
    scope: tokens.scope
  });

  return tokens;
}

/**
 * Refresh Gmail access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<GmailTokens> {
  console.log('🟩 [Gmail] Refreshing access token...');
  
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

  console.log('🟩 [Gmail] Refresh response status:', response.status);

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ [Gmail] Token refresh failed:', error);
    throw new Error(`Gmail token refresh failed: ${error}`);
  }

  const tokens = await response.json();
  console.log('✅ [Gmail] Token refreshed successfully');
  
  return tokens;
}

/**
 * Get Gmail tokens for a specific user
 */
export async function getUserGmailTokens(userId: string, organizationId: string): Promise<GmailTokens | null> {
  console.log('🟩 [Gmail] Getting user tokens:', { userId, organizationId });
  
  const { data, error } = await supabase
    .from('organization_integrations')
    .select('configuration')
    .eq('organization_id', organizationId)
    .eq('integration_type', 'gmail_user')
    .eq('is_enabled', true)
    .single();

  if (error) {
    console.error('❌ [Gmail] Error fetching integration:', error);
    return null;
  }

  if (!data) {
    console.log('⚠️ [Gmail] No gmail_user integration found for org:', organizationId);
    return null;
  }

  const config = data.configuration as any;
  const userTokens = config[userId];
  
  console.log('🟩 [Gmail] Token check result:', {
    hasConfig: !!config,
    hasUserTokens: !!userTokens,
    configKeys: Object.keys(config || {})
  });

  return userTokens || null;
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

async function getGmailDefaultSignature(
  organizationId: string,
  userId: string
): Promise<{ signature: string | null; sendAsEmail?: string }> {
  try {
    const result = await gmailApiRequest(
      organizationId,
      '/users/me/settings/sendAs',
      {},
      userId
    );

    const sendAsEntries = Array.isArray(result?.sendAs) ? result.sendAs : [];
    if (sendAsEntries.length === 0) {
      return { signature: null };
    }

    const preferredEntry =
      sendAsEntries.find((entry: any) => entry.isPrimary) ||
      sendAsEntries.find((entry: any) => entry.isDefault) ||
      sendAsEntries[0];

    if (!preferredEntry) {
      return { signature: null };
    }

    const signature = typeof preferredEntry.signature === 'string' ? preferredEntry.signature : null;
    const sendAsEmail = typeof preferredEntry.sendAsEmail === 'string' ? preferredEntry.sendAsEmail : undefined;

    return { signature: signature?.trim() ? signature : null, sendAsEmail };
  } catch (error) {
    console.error('⚠️ Error fetching Gmail default signature (likely missing scope):', error);
    return { signature: null };
  }
}

/**
 * Create email message in RFC 2822 format and encode to base64url
 */
function createEmailMessage(to: string, subject: string, body: string, from?: string): string {
  // Wrap body in proper HTML document structure for Gmail
  const htmlBody = body.trim().startsWith('<html') 
    ? body 
    : `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
</head>
<body>
${body}
</body>
</html>`;

  const messageParts = [
    from ? `From: ${from}` : '',
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    htmlBody
  ].filter(Boolean);

  const message = messageParts.join('\r\n');
  
  console.log('📧 [Gmail] Creating email message', {
    to,
    subject,
    from,
    bodyLength: htmlBody.length,
    messageLength: message.length
  });
  
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
    console.log('🔵 [Gmail] Creating draft with input:', {
      to: emailData.to,
      subject: emailData.subject,
      bodyLength: emailData.body?.length ?? 0,
      bodyPreview: emailData.body?.substring(0, 100)
    });

    const { signature, sendAsEmail } = await getGmailDefaultSignature(organizationId, userId);
    console.log('📧 [Gmail] Draft signature info', {
      hasSignature: !!signature,
      sendAsEmail,
      signaturePreview: signature?.substring(0, 100)
    });

    // Convert body to HTML (signature is already HTML from Gmail, don't convert it again!)
    const bodyHtml = convertToHtml(emailData.body);
    console.log('🔄 [Gmail] Body converted to HTML:', {
      originalLength: emailData.body?.length ?? 0,
      htmlLength: bodyHtml.length,
      htmlPreview: bodyHtml.substring(0, 150)
    });

    const bodyWithSignature = appendSignature(bodyHtml, signature);
    console.log('✨ [Gmail] Signature appended:', {
      bodyLength: bodyHtml.length,
      signatureLength: signature?.length ?? 0,
      finalLength: bodyWithSignature.length,
      finalPreview: bodyWithSignature.substring(0, 200)
    });

    const encodedMessage = createEmailMessage(emailData.to, emailData.subject, bodyWithSignature, sendAsEmail);

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

    console.log('✅ [Gmail] Draft created successfully', { 
      draftId: result.id,
      threadId: result.message?.threadId 
    });

    return { id: result.id, success: true };
  } catch (error) {
    console.error('❌ [Gmail] Error creating draft:', error);
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
    const { signature, sendAsEmail } = await getGmailDefaultSignature(organizationId, userId);
    console.log('📧 [Gmail] Send signature info', {
      hasSignature: !!signature,
      sendAsEmail,
    });

    // Convert body to HTML (signature is already HTML from Gmail, don't convert it again!)
    const bodyHtml = convertToHtml(emailData.body);
    const bodyWithSignature = appendSignature(bodyHtml, signature);

    console.log('📧 [Gmail] Send body lengths', {
      bodyHtmlLength: bodyHtml.length,
      signatureLength: signature?.length ?? 0,
      finalLength: bodyWithSignature.length,
    });
    const encodedMessage = createEmailMessage(emailData.to, emailData.subject, bodyWithSignature, sendAsEmail);

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

    console.log('✅ [Gmail] Email sent successfully', { 
      messageId: result.id,
      threadId: result.threadId 
    });

    return { id: result.id, success: true };
  } catch (error) {
    console.error('❌ [Gmail] Error sending email:', error);
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
    // Get user's timezone (default to America/New_York if not available)
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
    
    const event = {
      summary: eventData.summary,
      description: eventData.description || '',
      location: eventData.location || '',
      start: {
        dateTime: eventData.start,
        timeZone: userTimeZone // Use user's actual timezone, not UTC
      },
      end: {
        dateTime: eventData.end,
        timeZone: userTimeZone // Use user's actual timezone, not UTC
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

/**
 * Search Gmail emails
 */
export async function searchGmailEmails(
  organizationId: string,
  query: string,
  userId: string,
  maxResults: number = 10
): Promise<any[]> {
  try {
    console.log('🟩 [Gmail] Searching emails:', { query, maxResults });
    
    // First, search for message IDs
    const searchParams = new URLSearchParams({
      q: query,
      maxResults: maxResults.toString()
    });

    const searchResult = await gmailApiRequest(
      organizationId,
      `/users/me/messages?${searchParams.toString()}`,
      {},
      userId
    );

    const messageIds = searchResult.messages || [];
    console.log('🟩 [Gmail] Found message IDs:', messageIds.length);

    if (messageIds.length === 0) {
      return [];
    }

    // Fetch full details for each message
    const messages = await Promise.all(
      messageIds.slice(0, maxResults).map(async (msg: any) => {
        const details = await gmailApiRequest(
          organizationId,
          `/users/me/messages/${msg.id}`,
          {},
          userId
        );
        return details;
      })
    );

    console.log('✅ [Gmail] Fetched full details for', messages.length, 'emails');
    return messages;
  } catch (error) {
    console.error('Error searching Gmail emails:', error);
    throw error;
  }
}

/**
 * Get specific Gmail thread
 */
export async function getGmailThread(
  organizationId: string,
  threadId: string,
  userId: string
): Promise<any> {
  try {
    console.log('🟩 [Gmail] Getting thread:', threadId);
    
    const thread = await gmailApiRequest(
      organizationId,
      `/users/me/threads/${threadId}`,
      {},
      userId
    );

    console.log('✅ [Gmail] Thread retrieved');
    return thread;
  } catch (error) {
    console.error('Error getting Gmail thread:', error);
    throw error;
  }
}

/**
 * Search Google Calendar events
 */
export async function searchGoogleCalendarEvents(
  organizationId: string,
  query: string,
  userId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    maxResults?: number;
  }
): Promise<any[]> {
  try {
    console.log('🟩 [Gmail] Searching calendar events:', { query });
    
    const startDate = options?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
    const endDate = options?.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days ahead
    const maxResults = options?.maxResults || 20;

    const params = new URLSearchParams({
      q: query,
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

    console.log('✅ [Gmail] Found calendar events:', result.items?.length || 0);
    return result.items || [];
  } catch (error) {
    console.error('Error searching Google Calendar events:', error);
    throw error;
  }
}

