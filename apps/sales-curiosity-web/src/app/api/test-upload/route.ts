import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  console.log('🧪 TEST UPLOAD endpoint called');
  
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    console.log('🧪 File received:', !!file, file?.name, file?.size);
    
    return NextResponse.json({ 
      success: true, 
      fileName: file?.name,
      fileSize: file?.size,
      message: 'Test upload successful' 
    });
  } catch (error) {
    console.error('🧪 Test upload error:', error);
    return NextResponse.json({ error: 'Test upload failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ message: 'Test upload endpoint is working' });
}
