/**
 * HubSpot Integration Service
 * Handles OAuth, API calls, and CRM operations
 */

import { createClient } from '@supabase/supabase-js';

// HubSpot OAuth configuration
const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID || '';
const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET || '';
const HUBSPOT_REDIRECT_URI = process.env.HUBSPOT_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/hubspot/user-callback`;

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface HubSpotTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface HubSpotContact {
  id: string;
  properties: {
    email: string;
    firstname: string;
    lastname: string;
    jobtitle?: string;
    company?: string;
    lastmodifieddate: string;
  };
}

export interface HubSpotSearchResult {
  found: boolean;
  type: 'Contact' | null;
  data: HubSpotContact | null;
  lastInteractionDate?: string;
}

/**
 * Generate HubSpot OAuth URL
 */
export function getHubSpotAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: HUBSPOT_CLIENT_ID,
    redirect_uri: HUBSPOT_REDIRECT_URI,
    scope: 'crm.objects.contacts.read crm.objects.contacts.write crm.objects.companies.read',
    state,
  });

  return `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<HubSpotTokens> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: HUBSPOT_CLIENT_ID,
    client_secret: HUBSPOT_CLIENT_SECRET,
    redirect_uri: HUBSPOT_REDIRECT_URI,
    code,
  });

  const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HubSpot token exchange failed: ${error}`);
  }

  return await response.json();
}

/**
 * Refresh HubSpot access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<HubSpotTokens> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: HUBSPOT_CLIENT_ID,
    client_secret: HUBSPOT_CLIENT_SECRET,
    refresh_token: refreshToken,
  });

  const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HubSpot token refresh failed: ${error}`);
  }

  return await response.json();
}

/**
 * Get HubSpot tokens for a specific user
 */
export async function getUserHubSpotTokens(userId: string, organizationId: string): Promise<HubSpotTokens | null> {
  const { data, error } = await supabase
    .from('organization_integrations')
    .select('configuration')
    .eq('organization_id', organizationId)
    .eq('integration_type', 'hubspot_user')
    .eq('is_enabled', true)
    .single();

  if (error || !data) {
    return null;
  }

  const config = data.configuration as any;
  return config[userId] || null;
}

/**
 * Make authenticated HubSpot API request with automatic token refresh
 */
async function hubspotApiRequest(
  organizationId: string,
  endpoint: string,
  options: RequestInit = {},
  userId?: string
): Promise<any> {
  if (!userId) {
    throw new Error('User ID required for HubSpot integration');
  }

  let tokens = await getUserHubSpotTokens(userId, organizationId);
  
  if (!tokens) {
    throw new Error('HubSpot integration not configured');
  }

  const makeRequest = async (accessToken: string) => {
    const response = await fetch(`https://api.hubapi.com${endpoint}`, {
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
    console.log('HubSpot access token expired, refreshing...');
    
    try {
      const newTokens = await refreshAccessToken(tokens.refresh_token);
      
      // Update tokens in database
      const { data: existing } = await supabase
        .from('organization_integrations')
        .select('id, configuration')
        .eq('organization_id', organizationId)
        .eq('integration_type', 'hubspot_user')
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
      console.error('Token refresh failed:', refreshError);
      throw new Error('HubSpot authentication failed. Please reconnect your account.');
    }
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HubSpot API error: ${error}`);
  }

  return await response.json();
}

/**
 * Search for a person in HubSpot by email or name
 */
export async function searchPersonInHubSpot(
  organizationId: string,
  searchParams: {
    email?: string;
    firstName?: string;
    lastName?: string;
  },
  userId?: string
): Promise<HubSpotSearchResult> {
  try {
    const { email, firstName, lastName } = searchParams;
    
    if (!email && !firstName && !lastName) {
      return { found: false, type: null, data: null };
    }

    // Build search filters
    const filters: any[] = [];
    
    if (email) {
      filters.push({
        propertyName: 'email',
        operator: 'EQ',
        value: email
      });
    } else if (firstName || lastName) {
      if (firstName) {
        filters.push({
          propertyName: 'firstname',
          operator: 'EQ',
          value: firstName
        });
      }
      if (lastName) {
        filters.push({
          propertyName: 'lastname',
          operator: 'EQ',
          value: lastName
        });
      }
    }

    const searchPayload = {
      filterGroups: [{
        filters: filters
      }],
      properties: ['email', 'firstname', 'lastname', 'jobtitle', 'company', 'lastmodifieddate'],
      limit: 1
    };

    const result = await hubspotApiRequest(
      organizationId,
      '/crm/v3/objects/contacts/search',
      {
        method: 'POST',
        body: JSON.stringify(searchPayload)
      },
      userId
    );

    if (result.total > 0 && result.results.length > 0) {
      const contact = result.results[0];
      return {
        found: true,
        type: 'Contact',
        data: contact,
        lastInteractionDate: contact.properties.lastmodifieddate,
      };
    }

    return { found: false, type: null, data: null };
    
  } catch (error) {
    console.error('Error searching HubSpot:', error);
    throw error;
  }
}

/**
 * Create a new Contact in HubSpot
 */
export async function createHubSpotContact(
  organizationId: string,
  contactData: {
    firstName?: string;
    lastName: string;
    email?: string;
    title?: string;
    company?: string;
    linkedinUrl?: string;
  },
  userId?: string
): Promise<{ id: string; success: boolean }> {
  try {
    const properties: any = {
      lastname: contactData.lastName,
    };

    if (contactData.firstName) properties.firstname = contactData.firstName;
    if (contactData.email) properties.email = contactData.email;
    if (contactData.title) properties.jobtitle = contactData.title;
    if (contactData.company) properties.company = contactData.company;
    if (contactData.linkedinUrl) properties.linkedin_url = contactData.linkedinUrl;

    const result = await hubspotApiRequest(
      organizationId,
      '/crm/v3/objects/contacts',
      {
        method: 'POST',
        body: JSON.stringify({ properties }),
      },
      userId
    );

    return {
      id: result.id,
      success: true,
    };
  } catch (error) {
    console.error('Error creating HubSpot Contact:', error);
    throw error;
  }
}

/**
 * Add a note to a HubSpot contact
 */
export async function addHubSpotNote(
  organizationId: string,
  contactId: string,
  note: string,
  userId?: string
): Promise<{ id: string; success: boolean }> {
  try {
    const properties = {
      hs_timestamp: new Date().toISOString(),
      hs_note_body: note,
      hubspot_owner_id: contactId
    };

    const result = await hubspotApiRequest(
      organizationId,
      '/crm/v3/objects/notes',
      {
        method: 'POST',
        body: JSON.stringify({ properties }),
      },
      userId
    );

    // Associate note with contact
    await hubspotApiRequest(
      organizationId,
      `/crm/v3/objects/notes/${result.id}/associations/contacts/${contactId}/note_to_contact`,
      {
        method: 'PUT',
      },
      userId
    );

    return {
      id: result.id,
      success: true,
    };
  } catch (error) {
    console.error('Error adding HubSpot note:', error);
    throw error;
  }
}

