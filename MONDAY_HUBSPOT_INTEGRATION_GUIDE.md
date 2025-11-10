# 🚀 Monday.com & HubSpot Integration - Complete Implementation Guide

## Overview

This guide provides comprehensive instructions for implementing **Monday.com** and **HubSpot** CRM integrations that work exactly like the existing Salesforce integration. Each user will connect their own accounts via OAuth.

### What Users Will Be Able to Do:
- ✅ Connect their personal Monday.com or HubSpot account via OAuth
- ✅ Automatically check if LinkedIn prospects exist in their CRM
- ✅ Get AI-tailored emails (follow-up vs cold outreach)
- ✅ Auto-create new contacts in their CRM when drafting emails

---

# 📋 Table of Contents

1. [Monday.com Integration](#mondaycom-integration)
   - Account Setup
   - Files to Create
   - SQL Queries
   - Environment Variables
2. [HubSpot Integration](#hubspot-integration)
   - Account Setup
   - Files to Create
   - SQL Queries
   - Environment Variables
3. [Testing & Verification](#testing--verification)

---

# 1️⃣ Monday.com Integration

## Part 1: Create Monday.com App (15 minutes)

### Step 1: Sign Up for Monday.com Developer Account

1. Go to: **https://monday.com/**
2. Sign up for a free account or log in
3. Create a workspace if you don't have one

### Step 2: Access Developer Center

1. Go to: **https://monday.com/developers/apps**
2. Click **"Create App"** (top right)

### Step 3: Create OAuth App

1. **Basic Information:**
   - App Name: `Sales Curiosity Engine`
   - Short Description: `AI-powered sales intelligence for LinkedIn`
   - Icon: Upload your logo (optional)

2. **OAuth & Permissions:**
   - Click **"OAuth"** in left sidebar
   - Add BOTH Redirect URLs (needed for org-level AND user-level OAuth):
     ```
     https://www.curiosityengine.io/api/monday/callback
     https://www.curiosityengine.io/api/monday/user-callback
     ```
   - **First URL:** For organization-wide connections (admins)
   - **Second URL:** For individual user connections

3. **Permissions/Scopes** - Select these:
   - ✅ `boards:read` - Read board data
   - ✅ `boards:write` - Create and update items
   - ✅ `users:read` - Read user information
   - ✅ `me:read` - Read current user data

4. Click **"Save"**

### Step 4: Get Client Credentials

1. Go to **"OAuth"** section
2. Copy your credentials:
   - **Client ID** → Save this as `MONDAY_CLIENT_ID`
   - **Client Secret** → Click "Show" and save as `MONDAY_CLIENT_SECRET`

---

## Part 2: Files to Create for Monday.com

### File 1: Core Monday.com Service

**Location:** `apps/sales-curiosity-web/src/lib/monday.ts`

```typescript
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
  expires_in?: number;
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
    throw new Error(`Monday.com token exchange failed: ${error}`);
  }

  return await response.json();
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
    throw new Error('Monday.com integration not configured');
  }

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
    throw new Error(`Monday.com API error: ${error}`);
  }

  const result = await response.json();
  
  if (result.errors) {
    throw new Error(`Monday.com GraphQL error: ${JSON.stringify(result.errors)}`);
  }

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

    // Search for items in CRM boards by email or name
    const searchTerm = email || `${firstName || ''} ${lastName || ''}`.trim();
    
    const query = `
      query SearchContacts($searchTerm: String!) {
        boards(board_kind: crm) {
          id
          name
          items_page(limit: 1, query_params: {rules: [{column_id: "email", compare_value: [$searchTerm]}]}) {
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

    const result = await mondayApiRequest(
      organizationId,
      query,
      { searchTerm },
      userId
    );

    // Search through all CRM boards
    for (const board of result.boards || []) {
      const items = board.items_page?.items || [];
      
      if (items.length > 0) {
        const item = items[0];
        
        // Extract email and other details from columns
        const columns = item.column_values || [];
        const emailCol = columns.find((col: any) => col.id === 'email' || col.type === 'email');
        const titleCol = columns.find((col: any) => col.id === 'title' || col.id === 'text');
        const companyCol = columns.find((col: any) => col.id === 'company');

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

    return { found: false, data: null };
  } catch (error) {
    console.error('Error searching Monday.com:', error);
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

    // First, get the user's CRM boards
    const boardsQuery = `
      query {
        boards(board_kind: crm, limit: 1) {
          id
        }
      }
    `;

    const boardsResult = await mondayApiRequest(organizationId, boardsQuery, {}, userId);
    
    if (!boardsResult.boards || boardsResult.boards.length === 0) {
      throw new Error('No CRM boards found in Monday.com');
    }

    const boardId = boardsResult.boards[0].id;

    // Create item in the CRM board
    const mutation = `
      mutation CreateContact($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
        create_item(
          board_id: $boardId,
          item_name: $itemName,
          column_values: $columnValues
        ) {
          id
        }
      }
    `;

    const columnValues: any = {};
    
    if (contactData.email) {
      columnValues.email = { email: contactData.email, text: contactData.email };
    }
    if (contactData.title) {
      columnValues.title = contactData.title;
    }
    if (contactData.company) {
      columnValues.company = contactData.company;
    }
    if (contactData.linkedinUrl) {
      columnValues.linkedin = { url: contactData.linkedinUrl, text: 'LinkedIn Profile' };
    }

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

    return {
      id: result.create_item.id,
      success: true,
    };
  } catch (error) {
    console.error('Error creating Monday.com contact:', error);
    throw error;
  }
}
```

---

### File 2: Monday.com Auth Initiation Route

**Location:** `apps/sales-curiosity-web/src/app/api/monday/auth-user/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getMondayAuthUrl } from '@/lib/monday';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getUserFromExtensionToken } from '@/lib/extension-auth';
import { auth } from '@/lib/auth';

/**
 * Initiate Monday.com OAuth flow for individual user
 * GET /api/monday/auth-user
 */
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  
  try {
    let userEmail: string | undefined;
    let userId: string | undefined;
    
    // Try extension token first
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = await getUserFromExtensionToken(token);
      if (user) {
        userEmail = user.email;
        userId = user.id;
      }
    }
    
    // Fall back to NextAuth session
    if (!userEmail) {
      const session = await auth();
      if (session?.user?.email) {
        userEmail = session.user.email;
      }
    }
    
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user data
    if (!userId) {
      const { data: userData } = await supabase
        .from('users')
        .select('id, organization_id')
        .eq('email', userEmail)
        .maybeSingle();

      if (!userData) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      userId = userData.id;
    }
    
    // Get full user data
    const { data: userData } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('id', userId)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const organizationId = userData.organization_id || userData.id;

    // Check if already connected
    const { data: existingConnection } = await supabase
      .from('organization_integrations')
      .select('id, is_enabled, configuration')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'monday_user')
      .eq('is_enabled', true)
      .maybeSingle();

    if (existingConnection?.configuration) {
      const config = existingConnection.configuration as any;
      const userTokens = config && config[userId];
      
      if (userTokens && userTokens.access_token) {
        return NextResponse.json({
          ok: true,
          connected: true,
          message: 'Monday.com already connected'
        });
      }
    }

    // Generate OAuth URL
    const state = Buffer.from(
      JSON.stringify({
        userId: userData.id,
        organizationId: organizationId,
        type: 'user',
        timestamp: Date.now(),
      })
    ).toString('base64url');

    const authUrl = getMondayAuthUrl(state, true);

    return NextResponse.json({
      ok: true,
      connected: false,
      authUrl,
    });
  } catch (error) {
    console.error('Monday.com auth error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
```

---

### File 3: Monday.com OAuth Callback Route

**Location:** `apps/sales-curiosity-web/src/app/api/monday/user-callback/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/monday';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Monday.com OAuth callback for individual users
 * GET /api/monday/user-callback?code=xxx&state=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      const errorDescription = searchParams.get('error_description');
      return NextResponse.redirect(
        new URL(
          `/dashboard?error=${encodeURIComponent(errorDescription || error)}`,
          process.env.NEXT_PUBLIC_APP_URL
        )
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL(
          '/dashboard?error=Invalid OAuth callback',
          process.env.NEXT_PUBLIC_APP_URL
        )
      );
    }

    // Decode state
    let stateData;
    try {
      stateData = JSON.parse(
        Buffer.from(state, 'base64url').toString('utf-8')
      );
    } catch (e) {
      return NextResponse.redirect(
        new URL(
          '/dashboard?error=Invalid state parameter',
          process.env.NEXT_PUBLIC_APP_URL
        )
      );
    }

    const { userId, organizationId, type } = stateData;

    if (!userId || type !== 'user') {
      return NextResponse.redirect(
        new URL(
          '/dashboard?error=Invalid callback data',
          process.env.NEXT_PUBLIC_APP_URL
        )
      );
    }

    // Exchange code for tokens
    const userCallbackUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/monday/user-callback`;
    const tokens = await exchangeCodeForTokens(code, userCallbackUri);

    // Check for existing connection
    const { data: existing } = await supabase
      .from('organization_integrations')
      .select('id, configuration')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'monday_user')
      .maybeSingle();

    const userTokens = {
      [userId]: tokens
    };

    if (existing) {
      // Update existing
      const existingConfig = existing.configuration as any || {};
      const mergedConfig = {
        ...existingConfig,
        ...userTokens
      };

      await supabase
        .from('organization_integrations')
        .update({
          is_enabled: true,
          configuration: mergedConfig,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      // Create new
      await supabase
        .from('organization_integrations')
        .insert({
          organization_id: organizationId,
          integration_type: 'monday_user',
          is_enabled: true,
          configuration: userTokens,
          enabled_at: new Date().toISOString(),
          enabled_by: userId,
        });
    }

    return NextResponse.redirect(
      new URL(
        '/dashboard?success=Monday.com connected successfully&tab=integrations',
        process.env.NEXT_PUBLIC_APP_URL
      )
    );
  } catch (error) {
    console.error('Monday.com callback error:', error);
    return NextResponse.redirect(
      new URL(
        `/dashboard?error=${encodeURIComponent(String(error))}`,
        process.env.NEXT_PUBLIC_APP_URL
      )
    );
  }
}
```

---

## Part 3: Environment Variables for Monday.com

### Add to Vercel:

1. Go to Vercel → Your Project → Settings → Environment Variables

2. Add these variables:

```bash
# Monday.com OAuth
MONDAY_CLIENT_ID=your_monday_client_id_here
MONDAY_CLIENT_SECRET=your_monday_client_secret_here
MONDAY_REDIRECT_URI=https://www.curiosityengine.io/api/monday/callback
MONDAY_USER_REDIRECT_URI=https://www.curiosityengine.io/api/monday/user-callback
```

3. Apply to: **Production, Preview, Development**

4. Click **Save** for each

5. **Redeploy** your application

---

## Part 4: SQL for Monday.com

**No additional SQL needed!** The integration types are already included in `supabase-add-all-integrations.sql`. Just ensure you've run:

```sql
-- Already includes 'monday' and 'monday_user'
ALTER TABLE organization_integrations DROP CONSTRAINT IF EXISTS organization_integrations_integration_type_check;

ALTER TABLE organization_integrations ADD CONSTRAINT organization_integrations_integration_type_check 
  CHECK (integration_type IN (
    'salesforce', 'salesforce_user', 
    'hubspot', 'hubspot_user', 
    'monday', 'monday_user',
    'gmail', 'gmail_user', 
    'outlook', 'outlook_user',
    'calendar', 'slack', 'teams'
  ));
```

---

# 2️⃣ HubSpot Integration

## Part 1: Create HubSpot App (15 minutes)

### Step 1: Sign Up for HubSpot Developer Account

1. Go to: **https://developers.hubspot.com/**
2. Click **"Get started free"** or log in
3. Create a developer account

### Step 2: Create App

1. Go to: **https://developers.hubspot.com/apps**
2. Click **"Create app"**

### Step 3: Configure OAuth

1. **App Info:**
   - App name: `Sales Curiosity Engine`
   - Description: `AI-powered sales intelligence for LinkedIn`
   - Logo: Upload your logo (optional)

2. **Auth Tab:**
   - Add BOTH Redirect URLs (needed for org-level AND user-level OAuth):
     ```
     https://www.curiosityengine.io/api/hubspot/callback
     https://www.curiosityengine.io/api/hubspot/user-callback
     ```
   - **First URL:** For organization-wide connections (admins)
   - **Second URL:** For individual user connections

3. **Scopes** - Select these:
   - ✅ `crm.objects.contacts.read` - Read contacts
   - ✅ `crm.objects.contacts.write` - Create/update contacts
   - ✅ `crm.objects.companies.read` - Read companies
   - ✅ `crm.objects.companies.write` - Create/update companies
   - ✅ `crm.schemas.contacts.read` - Read contact properties

4. Click **"Save"**

### Step 4: Get Client Credentials

1. Go to **"Auth"** tab
2. Copy your credentials:
   - **Client ID** → Save as `HUBSPOT_CLIENT_ID`
   - **Client Secret** → Save as `HUBSPOT_CLIENT_SECRET`

---

## Part 2: Files to Create for HubSpot

### File 1: Core HubSpot Service

**Location:** `apps/sales-curiosity-web/src/lib/hubspot.ts`

```typescript
/**
 * HubSpot Integration Service
 * Handles OAuth, API calls, and CRM operations
 */

import { createClient } from '@supabase/supabase-js';

// HubSpot OAuth configuration
const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID!;
const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET!;
const HUBSPOT_REDIRECT_URI = process.env.HUBSPOT_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/hubspot/callback`;

// HubSpot API endpoint
const HUBSPOT_API_URL = 'https://api.hubapi.com';

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
    firstname?: string;
    lastname?: string;
    email?: string;
    jobtitle?: string;
    company?: string;
    lastmodifieddate?: string;
  };
}

export interface HubSpotSearchResult {
  found: boolean;
  data: HubSpotContact | null;
  lastInteractionDate?: string;
}

/**
 * Generate HubSpot OAuth URL
 */
export function getHubSpotAuthUrl(
  state: string,
  isUserLevel: boolean = false
): string {
  const userCallbackUri = process.env.HUBSPOT_USER_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/hubspot/user-callback`;
  const redirectUri = isUserLevel ? userCallbackUri : HUBSPOT_REDIRECT_URI;
  
  const params = new URLSearchParams({
    client_id: HUBSPOT_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'crm.objects.contacts.read crm.objects.contacts.write crm.objects.companies.read crm.objects.companies.write crm.schemas.contacts.read',
    state,
  });

  return `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri?: string
): Promise<HubSpotTokens> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: HUBSPOT_CLIENT_ID,
    client_secret: HUBSPOT_CLIENT_SECRET,
    redirect_uri: redirectUri || HUBSPOT_REDIRECT_URI,
    code,
  });

  const response = await fetch(`${HUBSPOT_API_URL}/oauth/v1/token`, {
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
export async function refreshAccessToken(
  refreshToken: string
): Promise<HubSpotTokens> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: HUBSPOT_CLIENT_ID,
    client_secret: HUBSPOT_CLIENT_SECRET,
    refresh_token: refreshToken,
  });

  const response = await fetch(`${HUBSPOT_API_URL}/oauth/v1/token`, {
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
export async function getUserHubSpotTokens(
  userId: string,
  organizationId: string
): Promise<HubSpotTokens | null> {
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
 * Get HubSpot tokens
 */
export async function getHubSpotTokens(
  userId: string,
  organizationId: string
): Promise<HubSpotTokens | null> {
  return await getUserHubSpotTokens(userId, organizationId);
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
  let tokens = userId
    ? await getHubSpotTokens(userId, organizationId)
    : null;

  if (!tokens) {
    throw new Error('HubSpot integration not configured');
  }

  const makeRequest = async (accessToken: string) => {
    const response = await fetch(`${HUBSPOT_API_URL}${endpoint}`, {
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
      const newTokens = await refreshAccessToken(tokens.refresh_token);

      // Update tokens in database
      const { data: existing } = await supabase
        .from('organization_integrations')
        .select('id, configuration')
        .eq('organization_id', organizationId)
        .eq('integration_type', 'hubspot_user')
        .single();

      if (existing && userId) {
        const config = existing.configuration as any || {};
        config[userId] = newTokens;

        await supabase
          .from('organization_integrations')
          .update({
            configuration: config,
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

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
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
    linkedinUrl?: string;
  },
  userId?: string
): Promise<HubSpotSearchResult> {
  try {
    const { email, firstName, lastName } = searchParams;

    if (!email && !firstName && !lastName) {
      return { found: false, data: null };
    }

    // Search by email first (most reliable)
    if (email) {
      try {
        const searchBody = {
          filterGroups: [
            {
              filters: [
                {
                  propertyName: 'email',
                  operator: 'EQ',
                  value: email,
                },
              ],
            },
          ],
          properties: ['firstname', 'lastname', 'email', 'jobtitle', 'company', 'lastmodifieddate'],
          limit: 1,
        };

        const result = await hubspotApiRequest(
          organizationId,
          '/crm/v3/objects/contacts/search',
          {
            method: 'POST',
            body: JSON.stringify(searchBody),
          },
          userId
        );

        if (result.results && result.results.length > 0) {
          const contact = result.results[0];
          return {
            found: true,
            data: contact,
            lastInteractionDate: contact.properties.lastmodifieddate,
          };
        }
      } catch (error) {
        console.error('Error searching HubSpot by email:', error);
      }
    }

    // Search by name if email not found
    if (firstName || lastName) {
      const filters: any[] = [];
      
      if (firstName) {
        filters.push({
          propertyName: 'firstname',
          operator: 'CONTAINS_TOKEN',
          value: firstName,
        });
      }
      
      if (lastName) {
        filters.push({
          propertyName: 'lastname',
          operator: 'CONTAINS_TOKEN',
          value: lastName,
        });
      }

      const searchBody = {
        filterGroups: [{ filters }],
        properties: ['firstname', 'lastname', 'email', 'jobtitle', 'company', 'lastmodifieddate'],
        limit: 1,
      };

      try {
        const result = await hubspotApiRequest(
          organizationId,
          '/crm/v3/objects/contacts/search',
          {
            method: 'POST',
            body: JSON.stringify(searchBody),
          },
          userId
        );

        if (result.results && result.results.length > 0) {
          const contact = result.results[0];
          return {
            found: true,
            data: contact,
            lastInteractionDate: contact.properties.lastmodifieddate,
          };
        }
      } catch (error) {
        console.error('Error searching HubSpot by name:', error);
      }
    }

    return { found: false, data: null };
  } catch (error) {
    console.error('Error searching HubSpot:', error);
    throw error;
  }
}

/**
 * Create a new contact in HubSpot
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
    if (contactData.linkedinUrl) properties.linkedinbio = contactData.linkedinUrl;

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
    console.error('Error creating HubSpot contact:', error);
    throw error;
  }
}
```

---

### File 2: HubSpot Auth Initiation Route

**Location:** `apps/sales-curiosity-web/src/app/api/hubspot/auth-user/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getHubSpotAuthUrl } from '@/lib/hubspot';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getUserFromExtensionToken } from '@/lib/extension-auth';
import { auth } from '@/lib/auth';

/**
 * Initiate HubSpot OAuth flow for individual user
 * GET /api/hubspot/auth-user
 */
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  
  try {
    let userEmail: string | undefined;
    let userId: string | undefined;
    
    // Try extension token first
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = await getUserFromExtensionToken(token);
      if (user) {
        userEmail = user.email;
        userId = user.id;
      }
    }
    
    // Fall back to NextAuth session
    if (!userEmail) {
      const session = await auth();
      if (session?.user?.email) {
        userEmail = session.user.email;
      }
    }
    
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user data
    if (!userId) {
      const { data: userData } = await supabase
        .from('users')
        .select('id, organization_id')
        .eq('email', userEmail)
        .maybeSingle();

      if (!userData) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      userId = userData.id;
    }
    
    // Get full user data
    const { data: userData } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('id', userId)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const organizationId = userData.organization_id || userData.id;

    // Check if already connected
    const { data: existingConnection } = await supabase
      .from('organization_integrations')
      .select('id, is_enabled, configuration')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'hubspot_user')
      .eq('is_enabled', true)
      .maybeSingle();

    if (existingConnection?.configuration) {
      const config = existingConnection.configuration as any;
      const userTokens = config && config[userId];
      
      if (userTokens && userTokens.access_token) {
        return NextResponse.json({
          ok: true,
          connected: true,
          message: 'HubSpot already connected'
        });
      }
    }

    // Generate OAuth URL
    const state = Buffer.from(
      JSON.stringify({
        userId: userData.id,
        organizationId: organizationId,
        type: 'user',
        timestamp: Date.now(),
      })
    ).toString('base64url');

    const authUrl = getHubSpotAuthUrl(state, true);

    return NextResponse.json({
      ok: true,
      connected: false,
      authUrl,
    });
  } catch (error) {
    console.error('HubSpot auth error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
```

---

### File 3: HubSpot OAuth Callback Route

**Location:** `apps/sales-curiosity-web/src/app/api/hubspot/user-callback/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/hubspot';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * HubSpot OAuth callback for individual users
 * GET /api/hubspot/user-callback?code=xxx&state=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      const errorDescription = searchParams.get('error_description');
      return NextResponse.redirect(
        new URL(
          `/dashboard?error=${encodeURIComponent(errorDescription || error)}`,
          process.env.NEXT_PUBLIC_APP_URL
        )
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL(
          '/dashboard?error=Invalid OAuth callback',
          process.env.NEXT_PUBLIC_APP_URL
        )
      );
    }

    // Decode state
    let stateData;
    try {
      stateData = JSON.parse(
        Buffer.from(state, 'base64url').toString('utf-8')
      );
    } catch (e) {
      return NextResponse.redirect(
        new URL(
          '/dashboard?error=Invalid state parameter',
          process.env.NEXT_PUBLIC_APP_URL
        )
      );
    }

    const { userId, organizationId, type } = stateData;

    if (!userId || type !== 'user') {
      return NextResponse.redirect(
        new URL(
          '/dashboard?error=Invalid callback data',
          process.env.NEXT_PUBLIC_APP_URL
        )
      );
    }

    // Exchange code for tokens
    const userCallbackUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/hubspot/user-callback`;
    const tokens = await exchangeCodeForTokens(code, userCallbackUri);

    // Check for existing connection
    const { data: existing } = await supabase
      .from('organization_integrations')
      .select('id, configuration')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'hubspot_user')
      .maybeSingle();

    const userTokens = {
      [userId]: tokens
    };

    if (existing) {
      // Update existing
      const existingConfig = existing.configuration as any || {};
      const mergedConfig = {
        ...existingConfig,
        ...userTokens
      };

      await supabase
        .from('organization_integrations')
        .update({
          is_enabled: true,
          configuration: mergedConfig,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      // Create new
      await supabase
        .from('organization_integrations')
        .insert({
          organization_id: organizationId,
          integration_type: 'hubspot_user',
          is_enabled: true,
          configuration: userTokens,
          enabled_at: new Date().toISOString(),
          enabled_by: userId,
        });
    }

    return NextResponse.redirect(
      new URL(
        '/dashboard?success=HubSpot connected successfully&tab=integrations',
        process.env.NEXT_PUBLIC_APP_URL
      )
    );
  } catch (error) {
    console.error('HubSpot callback error:', error);
    return NextResponse.redirect(
      new URL(
        `/dashboard?error=${encodeURIComponent(String(error))}`,
        process.env.NEXT_PUBLIC_APP_URL
      )
    );
  }
}
```

---

## Part 3: Environment Variables for HubSpot

### Add to Vercel:

1. Go to Vercel → Your Project → Settings → Environment Variables

2. Add these variables:

**IMPORTANT:** You need TWO redirect URIs - one for org-level, one for user-level:

```bash
# HubSpot OAuth
HUBSPOT_CLIENT_ID=your_hubspot_client_id_here
HUBSPOT_CLIENT_SECRET=your_hubspot_client_secret_here

# For organization-level connections (admins connecting for whole org)
HUBSPOT_REDIRECT_URI=https://www.curiosityengine.io/api/hubspot/callback

# For user-level connections (individual users connecting their own accounts)
HUBSPOT_USER_REDIRECT_URI=https://www.curiosityengine.io/api/hubspot/user-callback
```

**Make sure HUBSPOT_REDIRECT_URI uses `/callback` NOT `/user-callback`** (learned from Salesforce!)

3. Apply to: **Production, Preview, Development**

4. Click **Save** for each

5. **Redeploy** your application

---

## Part 4: SQL for HubSpot

**No additional SQL needed!** The integration types are already included. The same SQL from Monday.com applies.

---

# 🔗 Integration with Prospects API

To make these integrations work like Salesforce, you need to update the prospects API to check for Monday.com and HubSpot.

**File to modify:** `apps/sales-curiosity-web/src/app/api/prospects/route.ts`

Add these checks after the Salesforce check (around line 200):

```typescript
// After Salesforce check...

// Check Monday.com integration
if (!salesforceResult || !salesforceResult.found) {
  if (user && organizationId) {
    const { data: mondayIntegration } = await supabase
      .from('organization_integrations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'monday_user')
      .eq('is_enabled', true)
      .single();
    
    if (mondayIntegration) {
      try {
        const { searchPersonInMonday } = await import('@/lib/monday');
        
        const emailMatch = profileData.fullPageText?.match(/[\w.-]+@[\w.-]+\.\w+/);
        const email = emailMatch ? emailMatch[0] : undefined;
        const nameParts = profileData.name?.split(' ') || [];
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');
        
        const mondayResult = await searchPersonInMonday(organizationId, {
          email,
          firstName,
          lastName,
          linkedinUrl,
        }, user.id);
        
        if (mondayResult.found) {
          salesforceResult = {
            found: true,
            type: 'Contact',
            data: mondayResult.data,
            lastInteractionDate: mondayResult.lastInteractionDate,
          };
        }
        
        console.log('Monday.com search result:', mondayResult);
      } catch (error) {
        console.error('Monday.com search error:', error);
      }
    }
  }
}

// Check HubSpot integration
if (!salesforceResult || !salesforceResult.found) {
  if (user && organizationId) {
    const { data: hubspotIntegration } = await supabase
      .from('organization_integrations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'hubspot_user')
      .eq('is_enabled', true)
      .single();
    
    if (hubspotIntegration) {
      try {
        const { searchPersonInHubSpot } = await import('@/lib/hubspot');
        
        const emailMatch = profileData.fullPageText?.match(/[\w.-]+@[\w.-]+\.\w+/);
        const email = emailMatch ? emailMatch[0] : undefined;
        const nameParts = profileData.name?.split(' ') || [];
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');
        
        const hubspotResult = await searchPersonInHubSpot(organizationId, {
          email,
          firstName,
          lastName,
          linkedinUrl,
        }, user.id);
        
        if (hubspotResult.found) {
          salesforceResult = {
            found: true,
            type: 'Contact',
            data: hubspotResult.data,
            lastInteractionDate: hubspotResult.lastInteractionDate,
          };
        }
        
        console.log('HubSpot search result:', hubspotResult);
      } catch (error) {
        console.error('HubSpot search error:', error);
      }
    }
  }
}
```

Also add auto-create functionality after email generation (around line 450):

```typescript
// After generating email, if person not found, create in connected CRM
if (!salesforceResult?.found && generatedContent) {
  // Try Monday.com
  const { data: mondayIntegration } = await supabase
    .from('organization_integrations')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('integration_type', 'monday_user')
    .eq('is_enabled', true)
    .maybeSingle();
  
  if (mondayIntegration) {
    try {
      const { createMondayContact } = await import('@/lib/monday');
      await createMondayContact(organizationId, {
        firstName: profileData.name?.split(' ')[0],
        lastName: profileData.name?.split(' ').slice(1).join(' ') || 'Unknown',
        email: profileData.fullPageText?.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0],
        title: profileData.headline,
        company: profileData.company,
        linkedinUrl,
      }, user?.id);
      console.log('✅ Contact auto-created in Monday.com');
    } catch (error) {
      console.error('Failed to create Monday.com contact:', error);
    }
  }
  
  // Try HubSpot
  const { data: hubspotIntegration } = await supabase
    .from('organization_integrations')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('integration_type', 'hubspot_user')
    .eq('is_enabled', true)
    .maybeSingle();
  
  if (hubspotIntegration) {
    try {
      const { createHubSpotContact } = await import('@/lib/hubspot');
      await createHubSpotContact(organizationId, {
        firstName: profileData.name?.split(' ')[0],
        lastName: profileData.name?.split(' ').slice(1).join(' ') || 'Unknown',
        email: profileData.fullPageText?.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0],
        title: profileData.headline,
        company: profileData.company,
        linkedinUrl,
      }, user?.id);
      console.log('✅ Contact auto-created in HubSpot');
    } catch (error) {
      console.error('Failed to create HubSpot contact:', error);
    }
  }
}
```

---

# 🧪 Testing & Verification

## Testing Monday.com

1. **Connect Account:**
   - Open extension → Settings → Integrations
   - Click "Connect Monday.com"
   - Log in with Monday.com credentials
   - Authorize the app

2. **Test Search:**
   - Go to LinkedIn profile of someone in your Monday.com CRM
   - Generate email
   - Should detect them and generate "follow-up" email

3. **Test Auto-Create:**
   - Go to LinkedIn profile of someone NOT in Monday.com
   - Generate email
   - Should create new contact in Monday.com

## Testing HubSpot

1. **Connect Account:**
   - Open extension → Settings → Integrations
   - Click "Connect HubSpot"
   - Log in with HubSpot credentials
   - Authorize the app

2. **Test Search:**
   - Go to LinkedIn profile of someone in your HubSpot CRM
   - Generate email
   - Should detect them and generate "follow-up" email

3. **Test Auto-Create:**
   - Go to LinkedIn profile of someone NOT in HubSpot
   - Generate email
   - Should create new contact in HubSpot

---

# 📊 Summary Checklist

## Monday.com Integration

- [ ] Created Monday.com app at https://monday.com/developers/apps
- [ ] Got Client ID and Client Secret
- [ ] Created `apps/sales-curiosity-web/src/lib/monday.ts`
- [ ] Created `apps/sales-curiosity-web/src/app/api/monday/auth-user/route.ts`
- [ ] Created `apps/sales-curiosity-web/src/app/api/monday/user-callback/route.ts`
- [ ] Added `MONDAY_CLIENT_ID` to Vercel
- [ ] Added `MONDAY_CLIENT_SECRET` to Vercel
- [ ] Added `MONDAY_REDIRECT_URI` to Vercel
- [ ] Added `MONDAY_USER_REDIRECT_URI` to Vercel
- [ ] Ran SQL to add integration types (if not already done)
- [ ] Updated prospects API to check Monday.com
- [ ] Redeployed application
- [ ] Tested connection
- [ ] Tested search functionality
- [ ] Tested auto-create functionality

## HubSpot Integration

- [ ] Created HubSpot app at https://developers.hubspot.com/apps
- [ ] Got Client ID and Client Secret
- [ ] Created `apps/sales-curiosity-web/src/lib/hubspot.ts`
- [ ] Created `apps/sales-curiosity-web/src/app/api/hubspot/auth-user/route.ts`
- [ ] Created `apps/sales-curiosity-web/src/app/api/hubspot/user-callback/route.ts`
- [ ] Added `HUBSPOT_CLIENT_ID` to Vercel
- [ ] Added `HUBSPOT_CLIENT_SECRET` to Vercel
- [ ] Added `HUBSPOT_REDIRECT_URI` to Vercel
- [ ] Added `HUBSPOT_USER_REDIRECT_URI` to Vercel
- [ ] Ran SQL to add integration types (if not already done)
- [ ] Updated prospects API to check HubSpot
- [ ] Redeployed application
- [ ] Tested connection
- [ ] Tested search functionality
- [ ] Tested auto-create functionality

---

# 🎯 Key Differences from Salesforce

## Monday.com
- Uses GraphQL API instead of REST
- Stores contacts as "items" in CRM boards
- No separate Lead object (all are items)
- Scopes are simpler: `boards:read`, `boards:write`

## HubSpot
- REST API with JSON
- Has separate Contacts and Companies
- Token refresh is similar to Salesforce
- More granular scopes: `crm.objects.contacts.read/write`

---

# 🔒 Security Notes

- All tokens are encrypted and stored in Supabase
- Each user connects their own account (user-level OAuth)
- Tokens auto-refresh when expired
- Row Level Security (RLS) policies apply
- Users can disconnect anytime

---

# 📚 Additional Resources

## Monday.com
- Developer Portal: https://monday.com/developers
- API Docs: https://developer.monday.com/api-reference/docs
- OAuth Guide: https://developer.monday.com/apps/docs/oauth

## HubSpot
- Developer Portal: https://developers.hubspot.com/
- API Docs: https://developers.hubspot.com/docs/api/overview
- OAuth Guide: https://developers.hubspot.com/docs/api/oauth-quickstart-guide
- CRM API: https://developers.hubspot.com/docs/api/crm/contacts

---

**You're all set! Users can now connect Monday.com and HubSpot accounts just like Salesforce! 🎉**

