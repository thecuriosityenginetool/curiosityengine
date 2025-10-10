import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Get NextAuth session
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Loading org data for user:', session.user.email);

    // Verify they're an admin
    if (session.user.role !== 'org_admin' && session.user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Not authorized - admin only' },
        { status: 403 }
      );
    }

    const organizationId = session.user.organizationId;
    console.log('Loading org data for:', organizationId);

    // Load ALL organization data using service role (bypasses RLS)
    const [usersResult, analysesResult, emailsResult, integrationsResult] = await Promise.all([
      supabase.from('users').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }),
      supabase.from('linkedin_analyses').select('*, users(email, full_name)').eq('organization_id', organizationId).order('created_at', { ascending: false }),
      supabase.from('email_generations').select('*, users(email, full_name)').eq('organization_id', organizationId).order('created_at', { ascending: false }),
      supabase.from('organization_integrations').select('*').eq('organization_id', organizationId),
    ]);

    console.log('Data loaded:', {
      users: usersResult.data?.length || 0,
      analyses: analysesResult.data?.length || 0,
      emails: emailsResult.data?.length || 0,
      integrations: integrationsResult.data?.length || 0
    });

    return NextResponse.json({
      ok: true,
      users: usersResult.data || [],
      analyses: analysesResult.data || [],
      emails: emailsResult.data || [],
      integrations: integrationsResult.data || [],
    });

  } catch (err) {
    console.error('Error loading organization data:', err);
    return NextResponse.json(
      { error: 'Internal Server Error: ' + (err as Error).message },
      { status: 500 }
    );
  }
}

