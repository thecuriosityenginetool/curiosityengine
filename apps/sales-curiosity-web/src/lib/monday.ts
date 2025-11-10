/**
 * Monday.com Integration Service
 * Handles OAuth, API calls, and CRM operations
 */

import { createClient } from '@supabase/supabase-js';

// Monday.com OAuth configuration
const MONDAY_CLIENT_ID = process.env.MONDAY_CLIENT_ID!;
const MONDAY_CLIENT_SECRET = process.env.MONDAY_CLIENT_SECRET!;
const MONDAY_REDIRECT_URI = process.env.MONDAY_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/monday/callback`;

// Monday.com API endpoint
const MONDAY_API_URL = 'https://api.monday.com/v2';

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface MondayTokens {
  access_token: string;
  token_type: string;
  scope: string;
}

export interface MondayContact {
  id: string;
  name: string;
  email?: string;
  title?: string;
  company?: string;
  board_id: string;
}

export interface MondaySearchResult {
  found: boolean;
  data: MondayContact | null;
  lastInteractionDate?: string;
}

/**
 * Generate Monday.com OAuth URL
 */
export function getMondayAuthUrl(
  state: string,
  isUserLevel: boolean = false
): string {
  const userCallbackUri = process.env.MONDAY_USER_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/monday/user-callback`;
  const redirectUri = isUserLevel ? userCallbackUri : MONDAY_REDIRECT_URI;
  
  console.log('🟣 [Monday OAuth] Generating auth URL, isUserLevel:', isUserLevel);
  console.log('🟣 [Monday OAuth] Redirect URI:', redirectUri);
  
  const params = new URLSearchParams({
    client_id: MONDAY_CLIENT_ID,
    redirect_uri: redirectUri,
    state,
  });

  return `https://auth.monday.com/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri?: string
): Promise<MondayTokens> {
  console.log('🟣 [Monday Token Exchange] Starting...');
  
  const params = new URLSearchParams({
    code,
    client_id: MONDAY_CLIENT_ID,
    client_secret: MONDAY_CLIENT_SECRET,
    redirect_uri: redirectUri || MONDAY_REDIRECT_URI,
  });

  const response = await fetch('https://auth.monday.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ [Monday Token Exchange] Failed:', error);
    throw new Error(`Monday.com token exchange failed: ${error}`);
  }

  const tokens = await response.json();
  console.log('✅ [Monday Token Exchange] Success! Token type:', tokens.token_type);
  
  return tokens;
}

/**
 * Get Monday.com tokens for a specific user
 */
export async function getUserMondayTokens(
  userId: string,
  organizationId: string
): Promise<MondayTokens | null> {
  const { data, error } = await supabase
    .from('organization_integrations')
    .select('configuration')
    .eq('organization_id', organizationId)
    .eq('integration_type', 'monday_user')
    .eq('is_enabled', true)
    .single();

  if (error || !data) {
    return null;
  }

  const config = data.configuration as any;
  return config[userId] || null;
}

/**
 * Get Monday.com tokens - checks user level
 */
export async function getMondayTokens(
  userId: string,
  organizationId: string
): Promise<MondayTokens | null> {
  return await getUserMondayTokens(userId, organizationId);
}

/**
 * Make authenticated Monday.com GraphQL API request
 */
async function mondayApiRequest(
  organizationId: string,
  query: string,
  variables: any = {},
  userId?: string
): Promise<any> {
  const tokens = userId
    ? await getMondayTokens(userId, organizationId)
    : null;

  if (!tokens) {
    console.error('❌ [Monday API] No tokens found for user:', userId, 'org:', organizationId);
    throw new Error('Monday.com integration not configured');
  }

  console.log('🟣 [Monday API] Making GraphQL request');
  console.log('🟣 [Monday API] Query:', query.substring(0, 100) + '...');

  const response = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json',
      'API-Version': '2024-01',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ [Monday API] Request failed:', response.status, error);
    throw new Error(`Monday.com API error: ${error}`);
  }

  const result = await response.json();
  
  if (result.errors) {
    console.error('❌ [Monday API] GraphQL errors:', result.errors);
    throw new Error(`Monday.com GraphQL error: ${JSON.stringify(result.errors)}`);
  }

  console.log('✅ [Monday API] Request successful');
  return result.data;
}

/**
 * Search for a person in Monday.com CRM boards
 */
export async function searchPersonInMonday(
  organizationId: string,
  searchParams: {
    email?: string;
    firstName?: string;
    lastName?: string;
    linkedinUrl?: string;
  },
  userId?: string
): Promise<MondaySearchResult> {
  try {
    const { email, firstName, lastName } = searchParams;

    if (!email && !firstName && !lastName) {
      return { found: false, data: null };
    }

    console.log('🔍 [Monday Search] Searching for:', email || `${firstName} ${lastName}`);

    // Search for items in CRM boards by email or name
    const searchTerm = email || `${firstName || ''} ${lastName || ''}`.trim();
    
    const query = `
      query {
        boards(board_kind: crm, limit: 10) {
          id
          name
          items_page(limit: 50) {
            items {
              id
              name
              column_values {
                id
                text
                type
                value
              }
              updated_at
            }
          }
        }
      }
    `;

    const result = await mondayApiRequest(organizationId, query, {}, userId);

    console.log('🟣 [Monday Search] Boards found:', result.boards?.length || 0);

    // Search through all CRM boards for matching item
    for (const board of result.boards || []) {
      const items = board.items_page?.items || [];
      
      console.log('🟣 [Monday Search] Checking board:', board.name, 'Items:', items.length);
      
      for (const item of items) {
        // Check if item matches search criteria
        const columns = item.column_values || [];
        const emailCol = columns.find((col: any) => 
          col.type === 'email' || col.id === 'email' || col.id.includes('email')
        );
        
        const itemEmail = emailCol?.text?.toLowerCase();
        const itemName = item.name?.toLowerCase();
        const searchEmail = email?.toLowerCase();
        const searchName = `${firstName || ''} ${lastName || ''}`.toLowerCase().trim();
        
        // Match by email or name
        if ((searchEmail && itemEmail && itemEmail.includes(searchEmail)) ||
            (searchName && itemName && itemName.includes(searchName))) {
          
          console.log('✅ [Monday Search] Found match:', item.name);
          
          const titleCol = columns.find((col: any) => 
            col.id === 'title' || col.id === 'text' || col.id.includes('position')
          );
          const companyCol = columns.find((col: any) => 
            col.id === 'company' || col.id.includes('company')
          );

          return {
            found: true,
            data: {
              id: item.id,
              name: item.name,
              email: emailCol?.text,
              title: titleCol?.text,
              company: companyCol?.text,
              board_id: board.id,
            },
            lastInteractionDate: item.updated_at,
          };
        }
      }
    }

    console.log('❌ [Monday Search] No match found');
    return { found: false, data: null };
  } catch (error) {
    console.error('❌ [Monday Search] Error:', error);
    throw error;
  }
}

/**
 * Create a new contact in Monday.com CRM
 */
export async function createMondayContact(
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
    const fullName = contactData.firstName 
      ? `${contactData.firstName} ${contactData.lastName}`
      : contactData.lastName;

    console.log('➕ [Monday Create] Creating contact:', fullName);

    // First, get the user's CRM boards
    const boardsQuery = `
      query {
        boards(board_kind: crm, limit: 1) {
          id
          name
        }
      }
    `;

    const boardsResult = await mondayApiRequest(organizationId, boardsQuery, {}, userId);
    
    if (!boardsResult.boards || boardsResult.boards.length === 0) {
      console.error('❌ [Monday Create] No CRM boards found');
      throw new Error('No CRM boards found in Monday.com. Please create a CRM board first.');
    }

    const boardId = boardsResult.boards[0].id;
    console.log('🟣 [Monday Create] Using board:', boardsResult.boards[0].name, 'ID:', boardId);

    // Create item in the CRM board
    const mutation = `
      mutation CreateContact($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
        create_item(
          board_id: $boardId,
          item_name: $itemName,
          column_values: $columnValues
        ) {
          id
          name
        }
      }
    `;

    const columnValues: any = {};
    
    if (contactData.email) {
      columnValues.email = { email: contactData.email, text: contactData.email };
    }
    if (contactData.title) {
      columnValues.text = contactData.title;
    }
    if (contactData.company) {
      columnValues.text0 = contactData.company; // Adjust column ID as needed
    }
    if (contactData.linkedinUrl) {
      columnValues.link = { url: contactData.linkedinUrl, text: 'LinkedIn Profile' };
    }

    console.log('🟣 [Monday Create] Column values:', JSON.stringify(columnValues));

    const result = await mondayApiRequest(
      organizationId,
      mutation,
      {
        boardId,
        itemName: fullName,
        columnValues: JSON.stringify(columnValues),
      },
      userId
    );

    console.log('✅ [Monday Create] Contact created! ID:', result.create_item.id);

    return {
      id: result.create_item.id,
      success: true,
    };
  } catch (error) {
    console.error('❌ [Monday Create] Error:', error);
    throw error;
  }
}
