import { NextResponse } from 'next/server';
import { openai } from '@/lib/openai';

export async function GET() {
  try {
    console.log('Testing SambaNova API...');
    console.log('API Key present:', !!process.env.SAMBANOVA_API_KEY);
    console.log('API Key prefix:', process.env.SAMBANOVA_API_KEY?.substring(0, 20));
    
    // Simple test call
    const completion = await openai.chat.completions.create({
      model: 'DeepSeek-R1-0528',
      messages: [
        { role: 'user', content: 'Say "Hello, API is working!"' }
      ],
      max_tokens: 50,
    });

    const response = completion.choices[0]?.message?.content;
    
    return NextResponse.json({
      success: true,
      message: 'SambaNova API is working!',
      response,
      model: completion.model,
      usage: completion.usage,
    });
  } catch (error: any) {
    console.error('SambaNova Test Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      type: error.type,
      code: error.code,
      status: error.status,
      details: error.toString(),
    }, { status: 500 });
  }
}

