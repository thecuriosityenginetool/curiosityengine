/**
 * Salesforce Integration Service
 * Handles OAuth, API calls, and CRM operations
 */

import { createClient } from '@supabase/supabase-js';

// Salesforce OAuth configuration
const SALESFORCE_CLIENT_ID = process.env.SALESFORCE_CLIENT_ID!;
const SALESFORCE_CLIENT_SECRET = process.env.SALESFORCE_CLIENT_SECRET!;
const SALESFORCE_REDIRECT_URI = process.env.SALESFORCE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/salesforce/callback`;

// Salesforce API version
const SF_API_VERSION = 'v59.0';

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface SalesforceTokens {
  access_token: string;
  refresh_token: string;
  instance_url: string;
  id: string;
  issued_at: string;
  signature: string;
}

export interface SalesforceContact {
  Id: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Title: string;
  Account?: {
    Name: string;
  };
  LastModifiedDate: string;
}

export interface SalesforceLead {
  Id: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Title: string;
  Company: string;
  Status: string;
  LastModifiedDate: string;
}

export interface SalesforceSearchResult {
  found: boolean;
  type: 'Contact' | 'Lead' | null;
  data: SalesforceContact | SalesforceLead | null;
  lastInteractionDate?: string;
}

/**
 * Generate Salesforce OAuth URL
 * Supports both organization-specific credentials and fallback to env vars
 */
export function getSalesforceAuthUrl(
  state: string, 
  isUserLevel: boolean = false,
  customClientId?: string
): string {
  // Use different callback URL for user-level vs org-level
  // For user-level, use dedicated env var or fallback to NEXT_PUBLIC_APP_URL
  const userCallbackUri = process.env.SALESFORCE_USER_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/salesforce/user-callback`;
  const redirectUri = isUserLevel
    ? userCallbackUri
    : SALESFORCE_REDIRECT_URI;
    
  // Use custom client ID if provided, otherwise fall back to env var
  const clientId = customClientId || SALESFORCE_CLIENT_ID;
    
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    prompt: 'consent',
  });

  return `https://login.salesforce.com/services/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 * Supports both organization-specific credentials and fallback to env vars
 */
export async function exchangeCodeForTokens(
  code: string, 
  redirectUri?: string,
  customClientId?: string,
  customClientSecret?: string
): Promise<SalesforceTokens> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: customClientId || SALESFORCE_CLIENT_ID,
    client_secret: customClientSecret || SALESFORCE_CLIENT_SECRET,
    redirect_uri: redirectUri || SALESFORCE_REDIRECT_URI,
    code,
  });

  const response = await fetch('https://login.salesforce.com/services/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Salesforce token exchange failed: ${error}`);
  }

  return await response.json();
}

/**
 * Refresh Salesforce access token
 * Supports both organization-specific credentials and fallback to env vars
 */
export async function refreshAccessToken(
  refreshToken: string, 
  instanceUrl: string,
  customClientId?: string,
  customClientSecret?: string
): Promise<SalesforceTokens> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: customClientId || SALESFORCE_CLIENT_ID,
    client_secret: customClientSecret || SALESFORCE_CLIENT_SECRET,
    refresh_token: refreshToken,
  });

  const response = await fetch(`${instanceUrl}/services/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Salesforce token refresh failed: ${error}`);
  }

  return await response.json();
}

/**
 * Get Salesforce tokens for an organization
 */
export async function getOrganizationSalesforceTokens(organizationId: string): Promise<SalesforceTokens | null> {
  const { data, error } = await supabase
    .from('organization_integrations')
    .select('configuration')
    .eq('organization_id', organizationId)
    .eq('integration_type', 'salesforce')
    .eq('is_enabled', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data.configuration as SalesforceTokens;
}

/**
 * Get Salesforce tokens for a specific user (individual account)
 */
export async function getUserSalesforceTokens(userId: string, organizationId: string): Promise<SalesforceTokens | null> {
  const { data, error } = await supabase
    .from('organization_integrations')
    .select('configuration')
    .eq('organization_id', organizationId)
    .eq('integration_type', 'salesforce_user')
    .eq('is_enabled', true)
    .single();

  if (error || !data) {
    return null;
  }

  const config = data.configuration as any;
  return config[userId] || null;
}

/**
 * Get Salesforce tokens - checks both org and user level
 */
export async function getSalesforceTokens(userId: string, organizationId: string): Promise<SalesforceTokens | null> {
  // First try user-level tokens
  const userTokens = await getUserSalesforceTokens(userId, organizationId);
  if (userTokens) {
    return userTokens;
  }

  // Fall back to organization-level tokens
  return await getOrganizationSalesforceTokens(organizationId);
}

/**
 * Make authenticated Salesforce API request with automatic token refresh
 */
async function salesforceApiRequest(
  organizationId: string,
  endpoint: string,
  options: RequestInit = {},
  userId?: string
): Promise<any> {
  let tokens = userId 
    ? await getSalesforceTokens(userId, organizationId)
    : await getOrganizationSalesforceTokens(organizationId);
  
  if (!tokens) {
    throw new Error('Salesforce integration not configured');
  }

  const makeRequest = async (accessToken: string) => {
    const response = await fetch(`${tokens!.instance_url}${endpoint}`, {
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
    console.log('Access token expired, refreshing...');
    
    try {
      const newTokens = await refreshAccessToken(tokens.refresh_token, tokens.instance_url);
      
      // Update tokens in database
      await supabase
        .from('organization_integrations')
        .update({
          configuration: newTokens,
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', organizationId)
        .eq('integration_type', 'salesforce');

      // Retry request with new token
      response = await makeRequest(newTokens.access_token);
      tokens = newTokens;
    } catch (refreshError) {
      console.error('Token refresh failed:', refreshError);
      throw new Error('Salesforce authentication failed. Please reconnect your account.');
    }
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Salesforce API error: ${error}`);
  }

  return await response.json();
}

/**
 * Search for a person in Salesforce by email, name, or LinkedIn URL
 */
export async function searchPersonInSalesforce(
  organizationId: string,
  searchParams: {
    email?: string;
    firstName?: string;
    lastName?: string;
    linkedinUrl?: string;
  },
  userId?: string
): Promise<SalesforceSearchResult> {
  try {
    const { email, firstName, lastName, linkedinUrl } = searchParams;
    
    // Build SOSL search query
    let searchTerms: string[] = [];
    
    if (email) {
      searchTerms.push(`"${email}"`);
    }
    if (firstName && lastName) {
      searchTerms.push(`"${firstName} ${lastName}"`);
    } else if (firstName) {
      searchTerms.push(`"${firstName}"`);
    } else if (lastName) {
      searchTerms.push(`"${lastName}"`);
    }
    
    if (searchTerms.length === 0) {
      return { found: false, type: null, data: null };
    }

    // Search in Contacts first
    const contactQuery = `SELECT Id, FirstName, LastName, Email, Title, Account.Name, LastModifiedDate 
                          FROM Contact 
                          WHERE ${email ? `Email = '${email}'` : `Name LIKE '%${firstName || ''} ${lastName || ''}%'`}
                          ORDER BY LastModifiedDate DESC 
                          LIMIT 1`;

    const contactsEndpoint = `/services/data/${SF_API_VERSION}/query?q=${encodeURIComponent(contactQuery)}`;
    
    try {
      const contactsResult = await salesforceApiRequest(organizationId, contactsEndpoint, {}, userId);
      
      if (contactsResult.totalSize > 0) {
        const contact = contactsResult.records[0];
        return {
          found: true,
          type: 'Contact',
          data: contact,
          lastInteractionDate: contact.LastModifiedDate,
        };
      }
    } catch (error) {
      console.error('Error searching Contacts:', error);
    }

    // Search in Leads if not found in Contacts
    const leadQuery = `SELECT Id, FirstName, LastName, Email, Title, Company, Status, LastModifiedDate 
                       FROM Lead 
                       WHERE ${email ? `Email = '${email}'` : `Name LIKE '%${firstName || ''} ${lastName || ''}%'`}
                       ORDER BY LastModifiedDate DESC 
                       LIMIT 1`;

    const leadsEndpoint = `/services/data/${SF_API_VERSION}/query?q=${encodeURIComponent(leadQuery)}`;
    
    try {
      const leadsResult = await salesforceApiRequest(organizationId, leadsEndpoint, {}, userId);
      
      if (leadsResult.totalSize > 0) {
        const lead = leadsResult.records[0];
        return {
          found: true,
          type: 'Lead',
          data: lead,
          lastInteractionDate: lead.LastModifiedDate,
        };
      }
    } catch (error) {
      console.error('Error searching Leads:', error);
    }

    // Not found in either
    return { found: false, type: null, data: null };
    
  } catch (error) {
    console.error('Error searching Salesforce:', error);
    throw error;
  }
}

/**
 * Create a new Contact in Salesforce
 */
export async function createSalesforceContact(
  organizationId: string,
  contactData: {
    firstName?: string;
    lastName: string;
    email?: string;
    title?: string;
    company?: string;
    linkedinUrl?: string;
    description?: string;
  },
  userId?: string
): Promise<{ id: string; success: boolean }> {
  try {
    const payload: any = {
      LastName: contactData.lastName,
    };

    if (contactData.firstName) payload.FirstName = contactData.firstName;
    if (contactData.email) payload.Email = contactData.email;
    if (contactData.title) payload.Title = contactData.title;
    if (contactData.linkedinUrl) payload.LinkedIn__c = contactData.linkedinUrl; // Custom field if exists
    if (contactData.description) payload.Description = contactData.description;
    
    // Note: You might need to associate with an Account. For now, we'll create without one.
    // In production, you might want to search for or create an Account based on company name

    const endpoint = `/services/data/${SF_API_VERSION}/sobjects/Contact`;
    
    const result = await salesforceApiRequest(organizationId, endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, userId);

    return {
      id: result.id,
      success: result.success,
    };
  } catch (error) {
    console.error('Error creating Salesforce Contact:', error);
    throw error;
  }
}

/**
 * Create a new Lead in Salesforce
 */
export async function createSalesforceLead(
  organizationId: string,
  leadData: {
    firstName?: string;
    lastName: string;
    email?: string;
    title?: string;
    company: string;
    linkedinUrl?: string;
    description?: string;
  }
): Promise<{ id: string; success: boolean }> {
  try {
    const payload: any = {
      LastName: leadData.lastName,
      Company: leadData.company,
      Status: 'Open - Not Contacted', // Default status, adjust as needed
    };

    if (leadData.firstName) payload.FirstName = leadData.firstName;
    if (leadData.email) payload.Email = leadData.email;
    if (leadData.title) payload.Title = leadData.title;
    if (leadData.linkedinUrl) payload.LinkedIn__c = leadData.linkedinUrl; // Custom field if exists
    if (leadData.description) payload.Description = leadData.description;

    const endpoint = `/services/data/${SF_API_VERSION}/sobjects/Lead`;
    
    const result = await salesforceApiRequest(organizationId, endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      id: result.id,
      success: result.success,
    };
  } catch (error) {
    console.error('Error creating Salesforce Lead:', error);
    throw error;
  }
}

/**
 * Add a note/task to a Contact or Lead
 */
export async function addSalesforceNote(
  organizationId: string,
  recordId: string,
  note: string
): Promise<{ id: string; success: boolean }> {
  try {
    const payload = {
      Title: 'LinkedIn Outreach Note',
      Body: note,
      ParentId: recordId,
    };

    const endpoint = `/services/data/${SF_API_VERSION}/sobjects/Note`;
    
    const result = await salesforceApiRequest(organizationId, endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      id: result.id,
      success: result.success,
    };
  } catch (error) {
    console.error('Error adding Salesforce note:', error);
    throw error;
  }
}

/**
 * Update an existing Salesforce Contact
 */
export async function updateSalesforceContact(
  organizationId: string,
  contactId: string,
  updates: {
    FirstName?: string;
    LastName?: string;
    Email?: string;
    Title?: string;
    Phone?: string;
    MobilePhone?: string;
    Description?: string;
  },
  userId?: string
): Promise<{ id: string; success: boolean }> {
  try {
    const endpoint = `/services/data/${SF_API_VERSION}/sobjects/Contact/${contactId}`;
    
    const result = await salesforceApiRequest(organizationId, endpoint, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }, userId);

    return {
      id: contactId,
      success: result === null || result.success !== false, // PATCH returns 204 No Content on success
    };
  } catch (error) {
    console.error('Error updating Salesforce contact:', error);
    throw error;
  }
}

/**
 * Update an existing Salesforce Lead
 */
export async function updateSalesforceLead(
  organizationId: string,
  leadId: string,
  updates: {
    FirstName?: string;
    LastName?: string;
    Email?: string;
    Title?: string;
    Company?: string;
    Phone?: string;
    MobilePhone?: string;
    Description?: string;
    Status?: string;
  },
  userId?: string
): Promise<{ id: string; success: boolean }> {
  try {
    const endpoint = `/services/data/${SF_API_VERSION}/sobjects/Lead/${leadId}`;
    
    const result = await salesforceApiRequest(organizationId, endpoint, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }, userId);

    return {
      id: leadId,
      success: result === null || result.success !== false,
    };
  } catch (error) {
    console.error('Error updating Salesforce lead:', error);
    throw error;
  }
}

/**
 * Create a task in Salesforce
 */
export async function createSalesforceTask(
  organizationId: string,
  data: {
    WhoId: string; // Contact or Lead ID
    Subject: string;
    Description?: string;
    Status?: string;
    Priority?: string;
    ActivityDate?: string; // YYYY-MM-DD format
  },
  userId?: string
): Promise<{ id: string; success: boolean }> {
  try {
    const payload = {
      Subject: data.Subject,
      Description: data.Description || '',
      WhoId: data.WhoId,
      Status: data.Status || 'Not Started',
      Priority: data.Priority || 'Normal',
      ActivityDate: data.ActivityDate,
    };

    const endpoint = `/services/data/${SF_API_VERSION}/sobjects/Task`;
    
    const result = await salesforceApiRequest(organizationId, endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, userId);

    return {
      id: result.id,
      success: result.success,
    };
  } catch (error) {
    console.error('Error creating Salesforce task:', error);
    throw error;
  }
}

/**
 * Get recent activity for a Contact or Lead
 */
export async function getRecentActivity(
  organizationId: string,
  recordId: string,
  userId?: string
): Promise<{
  tasks: any[];
  events: any[];
  notes: any[];
}> {
  try {
    // Get recent tasks
    const tasksQuery = `SELECT Id, Subject, Status, Priority, ActivityDate, CreatedDate FROM Task WHERE WhoId = '${recordId}' ORDER BY CreatedDate DESC LIMIT 10`;
    const tasksEndpoint = `/services/data/${SF_API_VERSION}/query?q=${encodeURIComponent(tasksQuery)}`;
    const tasksResult = await salesforceApiRequest(organizationId, tasksEndpoint, {}, userId);

    // Get recent events
    const eventsQuery = `SELECT Id, Subject, StartDateTime, EndDateTime, Description, CreatedDate FROM Event WHERE WhoId = '${recordId}' ORDER BY CreatedDate DESC LIMIT 10`;
    const eventsEndpoint = `/services/data/${SF_API_VERSION}/query?q=${encodeURIComponent(eventsQuery)}`;
    const eventsResult = await salesforceApiRequest(organizationId, eventsEndpoint, {}, userId);

    // Get recent notes
    const notesQuery = `SELECT Id, Title, Body, CreatedDate FROM Note WHERE ParentId = '${recordId}' ORDER BY CreatedDate DESC LIMIT 10`;
    const notesEndpoint = `/services/data/${SF_API_VERSION}/query?q=${encodeURIComponent(notesQuery)}`;
    const notesResult = await salesforceApiRequest(organizationId, notesEndpoint, {}, userId);

    return {
      tasks: tasksResult.records || [],
      events: eventsResult.records || [],
      notes: notesResult.records || [],
    };
  } catch (error) {
    console.error('Error getting recent activity:', error);
    throw error;
  }
}

/**
 * Execute a flexible SOQL query
 */
export async function querySalesforce(
  organizationId: string,
  query: string,
  userId?: string
): Promise<any> {
  try {
    const endpoint = `/services/data/${SF_API_VERSION}/query?q=${encodeURIComponent(query)}`;
    const result = await salesforceApiRequest(organizationId, endpoint, {}, userId);
    return result;
  } catch (error) {
    console.error('Error executing Salesforce query:', error);
    throw error;
  }
}
