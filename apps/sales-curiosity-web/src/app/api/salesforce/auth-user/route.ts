import { NextRequest, NextResponse } from 'next/server';
import { getSalesforceAuthUrl } from '@/lib/salesforce';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getUserFromExtensionToken } from '@/lib/extension-auth';
import { auth } from '@/lib/auth';

/**
 * Initiate Salesforce OAuth flow for individual user
 * GET /api/salesforce/auth-user
 */
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  
  try {
    console.log('🟪 [Salesforce Auth-User] API called');
    console.log('🟪 [Salesforce Auth-User] Headers:', Object.fromEntries(req.headers.entries()));
    
    let userEmail: string | undefined;
    let userId: string | undefined;
    
    // Try extension token first (from Bearer header)
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      console.log('🟪 [Salesforce Auth-User] Found Bearer token, checking...');
      const token = authHeader.substring(7);
      const user = await getUserFromExtensionToken(token);
      if (user) {
        userEmail = user.email;
        userId = user.id;
        console.log('🟪 [Salesforce Auth-User] Extension auth successful:', userEmail);
      }
    }
    
    // Fall back to NextAuth session (for web app)
    if (!userEmail) {
      console.log('🟪 [Salesforce Auth-User] No extension token, checking NextAuth session...');
      const session = await auth();
      console.log('🟪 [Salesforce Auth-User] Session:', session ? '✓ Valid' : '✗ None');
      if (session?.user?.email) {
        userEmail = session.user.email;
        console.log('🟪 [Salesforce Auth-User] NextAuth email:', userEmail);
      }
    }
    
    if (!userEmail) {
      console.error('❌ [Salesforce Auth-User] No email found - user not authenticated');
      return NextResponse.json({ error: 'Unauthorized - please log in' }, { status: 401 });
    }

    // Get user data if we don't have it yet
    if (!userId) {
      console.log('🟪 [Salesforce Auth-User] Querying users table for:', userEmail);
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, organization_id')
        .eq('email', userEmail)
        .maybeSingle();

      if (userError) {
        console.error('❌ [Salesforce Auth-User] Database error:', userError);
        return NextResponse.json({ error: `Database error: ${userError.message}` }, { status: 500 });
      }

      if (!userData) {
        console.error('❌ [Salesforce Auth-User] User not found in database');
        return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
      }
      
      userId = userData.id;
      console.log('🟪 [Salesforce Auth-User] Found user ID:', userId);
    }
    
    // Get full user data for organizationId
    console.log('🟪 [Salesforce Auth-User] Fetching full user data...');
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('id', userId)
      .single();

    if (userDataError) {
      console.error('❌ [Salesforce Auth-User] Database error fetching user:', userDataError);
      return NextResponse.json({ error: `Database error: ${userDataError.message}` }, { status: 500 });
    }

    if (!userData) {
      console.error('❌ [Salesforce Auth-User] User not found (second check)');
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    console.log('🟪 [Salesforce Auth-User] User data:', { id: userData.id, organization_id: userData.organization_id });

    // Use user ID for individual connections, create dummy org if needed
    const organizationId = userData.organization_id || userData.id;
    console.log('🟪 [Salesforce Auth-User] Using organization_id:', organizationId);

    // Check if Salesforce is already connected for this user/organization
    const { data: existingConnection } = await supabase
      .from('organization_integrations')
      .select('id, is_enabled, configuration')
      .eq('organization_id', organizationId)
      .eq('integration_type', 'salesforce_user')
      .eq('is_enabled', true)
      .maybeSingle();

    console.log('🟪 [Salesforce Auth-User] Checking existing connection...');
    console.log('🟪 [Salesforce Auth-User] Existing connection:', existingConnection ? 'Found' : 'Not found');

    // If already connected, return connected status
    if (existingConnection?.configuration) {
      const config = existingConnection.configuration as any;
      
      console.log('🟪 [Salesforce Auth-User] Config structure:', typeof config);
      console.log('🟪 [Salesforce Auth-User] Config keys:', config ? Object.keys(config) : 'null');
      console.log('🟪 [Salesforce Auth-User] User ID:', userId);
      console.log('🟪 [Salesforce Auth-User] User tokens:', config && config[userId] ? 'Found' : 'Not found');
      
      // Check for user-specific tokens first (new format)
      const userTokens = config && config[userId];
      const hasUserTokens = userTokens && userTokens.access_token;
      
      // Fallback to direct config tokens (old format)
      const hasDirectTokens = config && config.access_token;
      
      const hasValidTokens = hasUserTokens || hasDirectTokens;
      
      console.log('🟪 [Salesforce Auth-User] Has user tokens:', hasUserTokens);
      console.log('🟪 [Salesforce Auth-User] Has direct tokens:', hasDirectTokens);
      console.log('🟪 [Salesforce Auth-User] Has valid tokens:', hasValidTokens);
      
      if (hasValidTokens) {
        console.log('✅ [Salesforce Auth-User] Salesforce already connected!');
        return NextResponse.json({
          ok: true,
          connected: true,
          message: 'Salesforce already connected'
        });
      } else {
        console.log('⚠️ [Salesforce Auth-User] Connection exists but no valid tokens');
        console.log('🟪 [Salesforce Auth-User] Debug config:', JSON.stringify(config, null, 2));
      }
    }

    // Not connected, generate OAuth URL
    console.log('🟪 [Salesforce Auth-User] Creating OAuth state...');
    // Create state token with user_id and organization_id
    const state = Buffer.from(
      JSON.stringify({
        userId: userData.id,
        organizationId: organizationId,
        type: 'user', // Mark this as user-level connection
        timestamp: Date.now(),
      })
    ).toString('base64url');

    console.log('🟪 [Salesforce Auth-User] Generated state:', state.substring(0, 20) + '...');

    // Generate Salesforce OAuth URL (user-level = true)
    const authUrl = getSalesforceAuthUrl(state, true);
    console.log('🟪 [Salesforce Auth-User] Generated authUrl:', authUrl);

    return NextResponse.json({
      ok: true,
      connected: false,
      authUrl,
    });
  } catch (error) {
    console.error('❌ [Salesforce Auth-User] Exception:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
