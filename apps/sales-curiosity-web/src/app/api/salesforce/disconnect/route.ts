import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function corsHeaders(origin?: string) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function isAllowedOrigin(origin: string | null) {
  if (!origin) return false;
  const allowed = [
    'chrome-extension://',
    process.env.NEXT_PUBLIC_APP_URL || '',
  ];
  return allowed.some((prefix) => origin.startsWith(prefix));
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return NextResponse.json({}, { status: 200, headers: corsHeaders(origin) });
}

/**
 * Disconnect Salesforce integration
 * POST /api/salesforce/disconnect
 */
export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get('origin');
    
    if (!isAllowedOrigin(origin)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: corsHeaders(origin) }
      );
    }

    // Get auth token from header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders(origin) }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401, headers: corsHeaders(origin) }
      );
    }

    // Get user's organization and verify admin role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404, headers: corsHeaders(origin) }
      );
    }

    // Check if user has permission
    if (!['org_admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Only organization admins can disconnect integrations' },
        { status: 403, headers: corsHeaders(origin) }
      );
    }

    // Disable the integration (soft delete - keep config for re-enabling)
    const { error: updateError } = await supabase
      .from('organization_integrations')
      .update({
        is_enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', userData.organization_id)
      .eq('integration_type', 'salesforce');

    if (updateError) {
      throw updateError;
    }

    // Log audit event
    await supabase.rpc('log_audit_event', {
      p_organization_id: userData.organization_id,
      p_action: 'salesforce_integration_disabled',
      p_resource_type: 'integration',
      p_details: { integration_type: 'salesforce' },
    });

    return NextResponse.json(
      {
        ok: true,
        message: 'Salesforce integration disconnected successfully',
      },
      { headers: corsHeaders(origin) }
    );
  } catch (error) {
    console.error('Error disconnecting Salesforce:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Salesforce integration' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
