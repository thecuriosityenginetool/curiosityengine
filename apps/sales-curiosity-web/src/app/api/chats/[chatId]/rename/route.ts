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

    // Generate title using SambaNova (DeepSeek)
    const completion = await openai.chat.completions.create({
      model: 'DeepSeek-R1-0528',
      messages: [
        {
          role: 'system',
          content: 'Generate a short, descriptive title (max 50 chars) for this conversation. Be concise and specific.'
        },
        {
          role: 'user',
          content: firstMessage
        }
      ],
      max_tokens: 20,
      temperature: 0.7,
    });

    const title = completion.choices[0]?.message?.content?.trim() || 'New Conversation';

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

