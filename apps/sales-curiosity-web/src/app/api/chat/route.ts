import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { message, conversationHistory = [], userContext, calendarEvents = [] } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get user from auth token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build system prompt with context
    let systemPrompt = `You are Curiosity Engine, an AI sales assistant. You help sales professionals by:
- Analyzing calendar events and suggesting optimal meeting times
- Drafting professional emails and messages
- Providing insights on prospects and leads
- Managing tasks and follow-ups
- Integrating with CRM, email, and calendar tools

Be concise, professional, and action-oriented.`;

    if (userContext) {
      systemPrompt += `\n\nUser Context:\n${JSON.stringify(userContext, null, 2)}`;
    }

    if (calendarEvents.length > 0) {
      systemPrompt += `\n\nUpcoming Calendar Events:\n${calendarEvents.map((event: any) => 
        `- ${event.title} at ${event.start} ${event.description ? '(' + event.description + ')' : ''}`
      ).join('\n')}`;
    }

    // Build conversation history for GPT-5
    const messages = [
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ];

    // Call GPT-5 with responses API
    const response = await openai.responses.create({
      model: 'gpt-5-mini',
      input: JSON.stringify({
        system: systemPrompt,
        messages
      }),
      reasoning: {
        effort: 'low'
      },
      text: {
        verbosity: 'medium'
      },
      max_output_tokens: 1000,
    });

    const aiResponse = response.output_text;

    // Save chat to database
    await supabase
      .from('chat_conversations')
      .insert({
        user_id: user.id,
        messages: [
          ...conversationHistory,
          { role: 'user', content: message, timestamp: new Date().toISOString() },
          { role: 'assistant', content: aiResponse, timestamp: new Date().toISOString() }
        ]
      });

    return NextResponse.json({ 
      response: aiResponse,
      success: true
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Get chat history
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

    const { data: conversations, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching chat history:', error);
      return NextResponse.json({ conversations: [] });
    }

    return NextResponse.json({ conversations: conversations || [] });

  } catch (error) {
    console.error('Get chat history error:', error);
    return NextResponse.json({ conversations: [] });
  }
}
