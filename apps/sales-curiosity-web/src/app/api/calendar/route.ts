import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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

    // TODO: Integrate with Google Calendar API and Outlook API
    // For now, return mock calendar events
    const mockEvents = [
      {
        id: '1',
        title: 'Sales Team Standup',
        start: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
        end: new Date(Date.now() + 2.5 * 60 * 60 * 1000).toISOString(),
        description: 'Daily sync with sales team',
        type: 'meeting',
        attendees: ['team@example.com']
      },
      {
        id: '2',
        title: 'Demo with Acme Corp',
        start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        end: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        description: 'Product demo for new prospect',
        type: 'demo',
        attendees: ['john@acmecorp.com']
      },
      {
        id: '3',
        title: 'Follow-up: Jane Smith',
        start: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
        end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
        description: 'Check in on proposal status',
        type: 'call',
        attendees: ['jane@prospect.com']
      }
    ];

    return NextResponse.json({ events: mockEvents });

  } catch (error) {
    console.error('Calendar API error:', error);
    return NextResponse.json({ events: [] });
  }
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

    const { title, start, end, description, attendees } = await req.json();

    // TODO: Create event in Google Calendar or Outlook
    console.log('Creating calendar event:', { title, start, end, description, attendees });

    return NextResponse.json({ 
      success: true,
      message: 'Calendar integration coming soon. Event will be created in your connected calendar.'
    });

  } catch (error) {
    console.error('Create calendar event error:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
