import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Enrich lead in Salesforce with AI insights
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { leadName, company, title, email, phone, notes } = body;

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('email', session.user.email)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get Salesforce tokens
    const { data: tokens } = await supabase
      .from('user_oauth_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', user.id)
      .eq('provider', 'salesforce')
      .maybeSingle();

    if (!tokens) {
      return NextResponse.json({ error: 'Salesforce not connected' }, { status: 400 });
    }

    // Create or update lead in Salesforce
    // First, search for existing lead
    const searchResponse = await fetch(
      `https://login.salesforce.com/services/data/v57.0/query?q=${encodeURIComponent(`SELECT Id FROM Lead WHERE Email='${email}' OR (FirstName='${leadName?.split(' ')[0]}' AND LastName='${leadName?.split(' ').slice(1).join(' ')}') LIMIT 1`)}`,
      {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const searchData = await searchResponse.json();
    let leadId = searchData.records?.[0]?.Id;

    if (leadId) {
      // Update existing lead
      await fetch(
        `https://login.salesforce.com/services/data/v57.0/sobjects/Lead/${leadId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            Description: notes,
            Title: title || undefined,
            Company: company || undefined
          })
        }
      );
    } else {
      // Create new lead
      const createResponse = await fetch(
        'https://login.salesforce.com/services/data/v57.0/sobjects/Lead',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            FirstName: leadName?.split(' ')[0] || 'Unknown',
            LastName: leadName?.split(' ').slice(1).join(' ') || 'Lead',
            Company: company || 'Unknown Company',
            Title: title,
            Email: email,
            Phone: phone,
            Description: notes,
            LeadSource: 'Curiosity Engine AI'
          })
        }
      );

      const createData = await createResponse.json();
      leadId = createData.id;
    }

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action_type: 'crm_lead_enriched',
        action_title: `Lead Enriched: ${leadName}`,
        action_description: `Added AI insights to Salesforce lead for ${company}`,
        metadata: { leadId, leadName, company },
        status: 'completed'
      });

    return NextResponse.json({ 
      success: true, 
      leadId,
      message: leadId ? 'Lead updated in Salesforce' : 'New lead created in Salesforce'
    });

  } catch (error) {
    console.error('Error enriching Salesforce lead:', error);
    return NextResponse.json({ 
      error: 'Failed to enrich lead', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

