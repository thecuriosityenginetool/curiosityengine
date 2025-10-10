/**
 * Monday.com Integration Service
 * Handles OAuth, GraphQL API calls, and board operations
 */

import { createClient } from '@supabase/supabase-js';

const MONDAY_CLIENT_ID = process.env.MONDAY_CLIENT_ID || '';
const MONDAY_CLIENT_SECRET = process.env.MONDAY_CLIENT_SECRET || '';
const MONDAY_REDIRECT_URI = process.env.MONDAY_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/monday/user-callback`;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface MondayTokens {
  access_token: string;
  token_type: string;
  scope: string;
}

export interface MondayItem {
  id: string;
  name: string;
  column_values: Array<{
    id: string;
    text: string;
    value: string;
  }>;
}

export interface MondaySearchResult {
  found: boolean;
  data: MondayItem | null;
}

/**
 * Generate Monday.com OAuth URL
 */
export function getMondayAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: MONDAY_CLIENT_ID,
    state,
  });

  return `https://auth.monday.com/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<MondayTokens> {
  const params = new URLSearchParams({
    code,
    client_id: MONDAY_CLIENT_ID,
    client_secret: MONDAY_CLIENT_SECRET,
    redirect_uri: MONDAY_REDIRECT_URI,
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
    throw new Error(`Monday.com token exchange failed: ${error}`);
  }

  return await response.json();
}

/**
 * Get Monday.com tokens for a specific user
 */
export async function getUserMondayTokens(userId: string, organizationId: string): Promise<MondayTokens | null> {
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
 * Make Monday.com GraphQL request
 */
async function mondayGraphQLRequest(
  query: string,
  variables: any,
  accessToken: string
): Promise<any> {
  const response = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      'Authorization': accessToken,
      'Content-Type': 'application/json',
      'API-Version': '2023-10',
    },
    body: JSON.stringify({
      query,
      variables
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Monday.com API error: ${error}`);
  }

  const result = await response.json();
  
  if (result.errors) {
    throw new Error(`Monday.com GraphQL error: ${JSON.stringify(result.errors)}`);
  }

  return result.data;
}

/**
 * Get user's boards
 */
export async function getUserBoards(
  organizationId: string,
  userId: string
): Promise<Array<{ id: string; name: string }>> {
  try {
    const tokens = await getUserMondayTokens(userId, organizationId);
    
    if (!tokens) {
      throw new Error('Monday.com integration not configured');
    }

    const query = `
      query {
        boards (limit: 50) {
          id
          name
        }
      }
    `;

    const result = await mondayGraphQLRequest(query, {}, tokens.access_token);
    
    return result.boards || [];
  } catch (error) {
    console.error('Error getting Monday.com boards:', error);
    throw error;
  }
}

/**
 * Search for a person in Monday.com by email
 */
export async function searchPersonInMonday(
  organizationId: string,
  boardId: string,
  emailColumnId: string,
  email: string,
  userId: string
): Promise<MondaySearchResult> {
  try {
    const tokens = await getUserMondayTokens(userId, organizationId);
    
    if (!tokens) {
      throw new Error('Monday.com integration not configured');
    }

    const query = `
      query ($boardId: [Int], $columnId: String!, $columnValue: String!) {
        items_by_column_values(board_id: $boardId, column_id: $columnId, column_value: $columnValue) {
          id
          name
          column_values {
            id
            text
            value
          }
        }
      }
    `;

    const variables = {
      boardId: [parseInt(boardId)],
      columnId: emailColumnId,
      columnValue: email
    };

    const result = await mondayGraphQLRequest(query, variables, tokens.access_token);
    
    if (result.items_by_column_values && result.items_by_column_values.length > 0) {
      return {
        found: true,
        data: result.items_by_column_values[0]
      };
    }

    return { found: false, data: null };
  } catch (error) {
    console.error('Error searching Monday.com:', error);
    throw error;
  }
}

/**
 * Create an item (contact) in Monday.com
 */
export async function createMondayItem(
  organizationId: string,
  boardId: string,
  groupId: string,
  itemName: string,
  columnValues: Record<string, any>,
  userId: string
): Promise<{ id: string; success: boolean }> {
  try {
    const tokens = await getUserMondayTokens(userId, organizationId);
    
    if (!tokens) {
      throw new Error('Monday.com integration not configured');
    }

    const query = `
      mutation ($boardId: Int!, $groupId: String!, $itemName: String!, $columnValues: JSON!) {
        create_item(board_id: $boardId, group_id: $groupId, item_name: $itemName, column_values: $columnValues) {
          id
        }
      }
    `;

    const variables = {
      boardId: parseInt(boardId),
      groupId,
      itemName,
      columnValues: JSON.stringify(columnValues)
    };

    const result = await mondayGraphQLRequest(query, variables, tokens.access_token);
    
    return {
      id: result.create_item.id,
      success: true
    };
  } catch (error) {
    console.error('Error creating Monday.com item:', error);
    throw error;
  }
}

/**
 * Update an item in Monday.com
 */
export async function updateMondayItem(
  organizationId: string,
  itemId: string,
  columnValues: Record<string, any>,
  userId: string
): Promise<{ success: boolean }> {
  try {
    const tokens = await getUserMondayTokens(userId, organizationId);
    
    if (!tokens) {
      throw new Error('Monday.com integration not configured');
    }

    const query = `
      mutation ($itemId: Int!, $columnValues: JSON!) {
        change_multiple_column_values(item_id: $itemId, column_values: $columnValues) {
          id
        }
      }
    `;

    const variables = {
      itemId: parseInt(itemId),
      columnValues: JSON.stringify(columnValues)
    };

    await mondayGraphQLRequest(query, variables, tokens.access_token);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating Monday.com item:', error);
    throw error;
  }
}

/**
 * Add update (note) to an item in Monday.com
 */
export async function addMondayUpdate(
  organizationId: string,
  itemId: string,
  updateText: string,
  userId: string
): Promise<{ id: string; success: boolean }> {
  try {
    const tokens = await getUserMondayTokens(userId, organizationId);
    
    if (!tokens) {
      throw new Error('Monday.com integration not configured');
    }

    const query = `
      mutation ($itemId: Int!, $body: String!) {
        create_update(item_id: $itemId, body: $body) {
          id
        }
      }
    `;

    const variables = {
      itemId: parseInt(itemId),
      body: updateText
    };

    const result = await mondayGraphQLRequest(query, variables, tokens.access_token);
    
    return {
      id: result.create_update.id,
      success: true
    };
  } catch (error) {
    console.error('Error adding Monday.com update:', error);
    throw error;
  }
}

/**
 * Get board columns (to understand structure)
 */
export async function getBoardColumns(
  organizationId: string,
  boardId: string,
  userId: string
): Promise<Array<{ id: string; title: string; type: string }>> {
  try {
    const tokens = await getUserMondayTokens(userId, organizationId);
    
    if (!tokens) {
      throw new Error('Monday.com integration not configured');
    }

    const query = `
      query ($boardId: [Int]) {
        boards(ids: $boardId) {
          columns {
            id
            title
            type
          }
        }
      }
    `;

    const variables = {
      boardId: [parseInt(boardId)]
    };

    const result = await mondayGraphQLRequest(query, variables, tokens.access_token);
    
    return result.boards[0]?.columns || [];
  } catch (error) {
    console.error('Error getting Monday.com board columns:', error);
    throw error;
  }
}

