import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

function corsHeaders(origin?: string) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function isAllowedOrigin(origin: string | null) {
  if (!origin) return true; // Allow requests without origin (like from same domain)
  const allowed = [
    'chrome-extension://',
    process.env.NEXT_PUBLIC_APP_URL || '',
    'https://your-app.vercel.app',
    'http://localhost:3000',
    'https://curiosityengine.io',
    'https://www.curiosityengine.io'
  ];
  return allowed.some((prefix) => origin.startsWith(prefix));
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// OPTIONS - Handle preflight requests
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return NextResponse.json({}, { status: 200, headers: corsHeaders(origin) });
}

// GET - Get user's sales materials
export async function GET(req: NextRequest) {
  try {
    const origin = req.headers.get('origin');
    
    if (!isAllowedOrigin(origin)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: corsHeaders(origin) }
      );
    }

    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders(origin) });
    }

    // Get user ID
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404, headers: corsHeaders(origin) });
    }

    // Get materials
    const { data: materials, error } = await supabase
      .from('sales_materials')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching materials:', error);
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders(origin) });
    }

    return NextResponse.json({ materials: materials || [] }, { headers: corsHeaders(origin) });
  } catch (error) {
    console.error('Error in GET /api/sales-materials:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders() });
  }
}

// POST - Upload sales material
export async function POST(req: NextRequest) {
  console.log('📁 POST /api/sales-materials called');
  
  try {
    const origin = req.headers.get('origin');
    console.log('📁 Origin:', origin);
    
    if (!isAllowedOrigin(origin)) {
      console.log('📁 Origin not allowed');
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: corsHeaders(origin) }
      );
    }

    console.log('📁 Getting session...');
    const session = await auth();
    console.log('📁 Session:', !!session, !!session?.user?.email);
    
    if (!session?.user?.email) {
      console.log('📁 No session or email');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders(origin) });
    }

    console.log('📁 Parsing form data...');
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    
    console.log('📁 File received:', !!file, file?.name, file?.size);
    console.log('📁 Description:', description);
    console.log('📁 Category:', category);

    if (!file) {
      console.log('📁 No file provided');
      return NextResponse.json({ error: 'File is required' }, { status: 400, headers: corsHeaders(origin) });
    }

    // Check file size (max 50MB for large documents)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 50MB limit. Please use a smaller file.' }, { status: 413, headers: corsHeaders(origin) });
    }

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('email', session.user.email)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404, headers: corsHeaders(origin) });
    }

    // Upload file to Supabase Storage
    const fileName = `${user.id}/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('sales-materials')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500, headers: corsHeaders(origin) });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('sales-materials')
      .getPublicUrl(fileName);

    // Extract text from file based on file type
    let fileText = '';
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'txt';
    const fileType = ['pdf', 'docx', 'txt', 'pptx', 'doc'].includes(fileExt) ? fileExt : 'txt';

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      switch (fileType) {
        case 'pdf':
          const pdfData = await pdf(arrayBuffer);
          fileText = pdfData.text;
          break;
        case 'docx':
        case 'doc':
          const docxResult = await mammoth.extractRawText({ buffer: arrayBuffer });
          fileText = docxResult.value;
          break;
        case 'txt':
          fileText = await file.text();
          break;
        case 'pptx':
          // For now, we'll extract basic text from PPTX
          // In a production environment, you might want to use a library like 'pptx2json'
          fileText = 'PowerPoint content extraction not yet implemented. Please convert to PDF or DOCX for better text extraction.';
          break;
        default:
          fileText = await file.text().catch(() => '');
      }
    } catch (error) {
      console.error('Error extracting text from file:', error);
      fileText = 'Error extracting text from file.';
    }

    // Save to database
    const { data: material, error: dbError } = await supabase
      .from('sales_materials')
      .insert({
        user_id: user.id,
        organization_id: user.organization_id,
        file_name: file.name,
        file_type: fileType === 'doc' ? 'docx' : fileType, // Store .doc as .docx in database
        file_size: file.size,
        file_url: urlData.publicUrl,
        extracted_text: fileText.substring(0, 50000), // Limit to 50k chars
        description: description || null,
        category: category || 'other'
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error saving material to DB:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500, headers: corsHeaders(origin) });
    }

    return NextResponse.json({ material, success: true }, { headers: corsHeaders(origin) });
  } catch (error) {
    console.error('Error in POST /api/sales-materials:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders() });
  }
}

// DELETE - Remove sales material
export async function DELETE(req: NextRequest) {
  try {
    const origin = req.headers.get('origin');
    
    if (!isAllowedOrigin(origin)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403, headers: corsHeaders(origin) }
      );
    }

    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders(origin) });
    }

    const { searchParams } = new URL(req.url);
    const materialId = searchParams.get('id');

    if (!materialId) {
      return NextResponse.json({ error: 'Material ID required' }, { status: 400, headers: corsHeaders(origin) });
    }

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404, headers: corsHeaders(origin) });
    }

    // Delete from database
    const { error } = await supabase
      .from('sales_materials')
      .delete()
      .eq('id', materialId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting material:', error);
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders(origin) });
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders(origin) });
  } catch (error) {
    console.error('Error in DELETE /api/sales-materials:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders() });
  }
}

