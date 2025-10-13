import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getOutlookCalendarEvents } from '@/lib/outlook';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization info
    const { data: userData } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if Outlook is connected
    const { data: outlookIntegration } = await supabase
      .from('organization_integrations')
      .select('is_enabled')
      .eq('organization_id', userData.organization_id)
      .in('integration_type', ['outlook', 'outlook_user'])
      .eq('is_enabled', true)
      .maybeSingle();

    let events = [];

    if (outlookIntegration) {
      // Fetch real Outlook calendar events
      try {
        console.log('📅 Fetching calendar events from Outlook...');
        const outlookEvents = await getOutlookCalendarEvents(
          userData.organization_id,
          userData.id,
          {
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // Next 14 days
            top: 20
          }
        );

        // Transform Outlook events to our format
        events = outlookEvents.map((event: any) => ({
          id: event.id,
          title: event.subject,
          start: event.start.dateTime,
          end: event.end.dateTime,
          description: event.bodyPreview || event.body?.content,
          type: 'meeting',
          attendees: event.attendees?.map((a: any) => a.emailAddress.address) || [],
          location: event.location?.displayName
        }));

        console.log(`✅ Fetched ${events.length} events from Outlook`);
      } catch (outlookError) {
        console.error('Error fetching from Outlook, falling back to mock data:', outlookError);
        // Fall back to mock data if Outlook fails
        events = getMockEvents();
      }
    } else {
      console.log('📅 Outlook not connected, using mock data');
      // Return mock events if Outlook not connected
      events = getMockEvents();
    }

    return NextResponse.json({ events });

  } catch (error) {
    console.error('Calendar API error:', error);
    return NextResponse.json({ events: getMockEvents() });
  }
}

function getMockEvents() {
  return [
    {
      id: '1',
      title: 'Sales Team Standup',
      start: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      end: new Date(Date.now() + 2.5 * 60 * 60 * 1000).toISOString(),
      description: 'Daily sync with sales team',
      type: 'meeting',
      attendees: ['team@example.com']
    },
    {
      id: '2',
      title: 'Demo with Acme Corp',
      start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      end: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
      description: 'Product demo for new prospect',
      type: 'demo',
      attendees: ['john@acmecorp.com']
    },
    {
      id: '3',
      title: 'Follow-up: Jane Smith',
      start: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
      description: 'Check in on proposal status',
      type: 'call',
      attendees: ['jane@prospect.com']
    }
  ];
}

// Create calendar event
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization info
    const { data: userData } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { title, start, end, description, attendees, location } = await req.json();

    // Check if Outlook is connected
    const { data: outlookIntegration } = await supabase
      .from('organization_integrations')
      .select('is_enabled')
      .eq('organization_id', userData.organization_id)
      .in('integration_type', ['outlook', 'outlook_user'])
      .eq('is_enabled', true)
      .maybeSingle();

    if (outlookIntegration) {
      // Create event in Outlook
      try {
        const { createOutlookCalendarEvent } = await import('@/lib/outlook');
        
        const result = await createOutlookCalendarEvent(
          userData.organization_id,
          {
            subject: title,
            start,
            end,
            body: description,
            attendees,
            location
          },
          userData.id
        );

        return NextResponse.json({ 
          success: true,
          eventId: result.id,
          message: 'Event created in Outlook calendar'
        });
      } catch (outlookError) {
        console.error('Error creating Outlook event:', outlookError);
        return NextResponse.json({ 
          success: false,
          error: 'Failed to create event in Outlook'
        }, { status: 500 });
      }
    } else {
      return NextResponse.json({ 
        success: false,
        error: 'Outlook not connected. Please connect Outlook to create calendar events.'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Create calendar event error:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
