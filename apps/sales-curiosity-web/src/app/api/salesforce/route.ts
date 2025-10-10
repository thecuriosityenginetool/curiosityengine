import { NextRequest, NextResponse } from 'next/server';
import { searchPersonInSalesforce, createSalesforceContact, createSalesforceLead } from '@/lib/salesforce';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders() });
}

/**
 * POST /api/salesforce - Search for a person or create a new contact/lead
 * Body: { action: 'search' | 'create', email?, firstName?, lastName?, linkedinUrl?, company?, title? }
 */
export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get('origin') || '';
    if (!isAllowedOrigin(origin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders(origin) });
    }

    // Get auth token and verify user
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

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404, headers: corsHeaders(origin) }
      );
    }

    const body = await req.json();
    const { action, email, firstName, lastName, linkedinUrl, company, title, description } = body;

    if (action === 'search') {
      // Search for person in Salesforce
      const searchResult = await searchPersonInSalesforce(userData.organization_id, {
        email,
        firstName,
        lastName,
        linkedinUrl,
      });

      return NextResponse.json(
        { ok: true, ...searchResult },
        { headers: corsHeaders(origin) }
      );
    } else if (action === 'create_contact') {
      // Create new contact
      const result = await createSalesforceContact(userData.organization_id, {
        firstName,
        lastName,
        email,
        title,
        company,
        linkedinUrl,
        description,
      });

      return NextResponse.json(
        { ok: true, ...result },
        { headers: corsHeaders(origin) }
      );
    } else if (action === 'create_lead') {
      // Create new lead
      if (!company) {
        return NextResponse.json(
          { error: 'Company is required for creating a lead' },
          { status: 400, headers: corsHeaders(origin) }
        );
      }

      const result = await createSalesforceLead(userData.organization_id, {
        firstName,
        lastName: lastName || email || 'Unknown',
        email,
        title,
        company,
        linkedinUrl,
        description,
      });

      return NextResponse.json(
        { ok: true, ...result },
        { headers: corsHeaders(origin) }
      );
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "search", "create_contact", or "create_lead"' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }
  } catch (err: any) {
    console.error('Salesforce API error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

function isAllowedOrigin(origin: string) {
  const allowed = ['chrome-extension://', process.env.NEXT_PUBLIC_APP_URL || '', 'https://your-app.vercel.app'];
  return allowed.some((prefix) => origin.startsWith(prefix));
}

function corsHeaders(origin?: string) {
  const o = origin || '*';
  return {
    'Access-Control-Allow-Origin': o,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  } as Record<string, string>;
}


