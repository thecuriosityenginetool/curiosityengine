import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { auth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, conversationHistory = [], userContext, calendarEvents = [] } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get user profile with company info
    const { data: user } = await supabase
      .from('users')
      .select('id, full_name, job_title, company_name, company_url, organization_id')
      .eq('email', session.user.email)
      .maybeSingle();

    // Get sales materials for context
    let salesMaterials = '';
    if (user) {
      const { data: materials } = await supabase
        .from('sales_materials')
        .select('file_name, extracted_text, category')
        .eq('user_id', user.id)
        .limit(5); // Limit to avoid token overload

      if (materials && materials.length > 0) {
        salesMaterials = '\n\nSales Materials & Company Guides:\n' + materials.map(m => 
          `[${m.category}] ${m.file_name}:\n${m.extracted_text?.substring(0, 1000) || 'No text extracted'}...`
        ).join('\n\n');
      }
    }

    // Build system prompt with context
    let systemPrompt = `You are Curiosity Engine, an AI sales assistant. You help sales professionals by:
- Analyzing calendar events and suggesting optimal meeting times
- Drafting professional emails and messages
- Providing insights on prospects and leads
- Managing tasks and follow-ups
- Integrating with CRM, email, and calendar tools

Be concise, professional, and action-oriented.`;

    // Add user profile context
    if (user) {
      systemPrompt += `\n\nUser Profile:
- Name: ${user.full_name || 'Not set'}
- Role: ${user.job_title || 'Not set'}
- Company: ${user.company_name || 'Not set'}
- Website: ${user.company_url || 'Not set'}`;
    }

    if (userContext) {
      systemPrompt += `\n\nUser Context:\n${JSON.stringify(userContext, null, 2)}`;
    }

    if (salesMaterials) {
      systemPrompt += salesMaterials;
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
