import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth';
import { openai } from '@/lib/openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Auto-generate chat title based on content
export async function POST(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = params;
    const { firstMessage } = await req.json();

    if (!firstMessage) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    // Generate title using SambaNova (use fast Llama model for simple task)
    console.log('🏷️ Generating chat title via SambaNova Cloud');
    const completion = await openai.chat.completions.create({
      model: 'Meta-Llama-3.1-8B-Instruct', // Fast model for simple title generation
      messages: [
        {
          role: 'system',
          content: 'Generate a short, descriptive title (max 50 chars) for this conversation. Output ONLY the title, no explanations, no thinking tags, no quotes. Be concise and specific.'
        },
        {
          role: 'user',
          content: firstMessage
        }
      ],
      max_tokens: 20,
      temperature: 0.7,
    });

    let title = completion.choices[0]?.message?.content?.trim() || 'New Conversation';
    
    // Strip any thinking tags that might appear
    title = title.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    
    // Remove any remaining XML-like tags
    title = title.replace(/<[^>]+>/g, '').trim();
    
    // If title is empty after stripping, use default
    if (!title) {
      title = 'New Conversation';
    }
    
    // Ensure max 50 chars
    if (title.length > 50) {
      title = title.substring(0, 47) + '...';
    }
    
    console.log('✅ Generated title:', title);

    // Update chat title
    const { error } = await supabase
      .from('chats')
      .update({ title })
      .eq('id', chatId);

    if (error) {
      console.error('Error updating chat title:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ title });
  } catch (error) {
    console.error('Error in POST /api/chats/[chatId]/rename:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

