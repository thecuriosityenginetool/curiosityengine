import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth';
import pdf from 'pdf-parse-fork';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

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

// GET - Get user's sales materials (including shared org materials)
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

    // Get user ID and organization
    const { data: user } = await supabase
      .from('users')
      .select('id, organization_id, role')
      .eq('email', session.user.email)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404, headers: corsHeaders(origin) });
    }

    // Get user permissions
    const { data: permissions } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', user.id)
      .eq('organization_id', user.organization_id)
      .maybeSingle();

    // Get materials - RLS will handle filtering based on visibility and permissions
    // This includes:
    // 1. User's own materials
    // 2. Organization-wide materials
    // 3. Team materials shared with the user
    const { data: materials, error } = await supabase
      .from('sales_materials')
      .select(`
        *,
        owner:users!sales_materials_user_id_fkey(id, full_name, email),
        material_permissions(user_id, can_view, can_edit, can_delete, can_share)
      `)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching materials:', error);
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders(origin) });
    }

    // Enrich materials with access info
    const enrichedMaterials = (materials || []).map(mat => ({
      ...mat,
      is_owner: mat.user_id === user.id,
      can_edit: mat.user_id === user.id || mat.material_permissions?.some((p: any) => p.user_id === user.id && p.can_edit),
      can_delete: mat.user_id === user.id || (permissions?.can_delete_org_materials && user.role === 'org_admin'),
      can_share: mat.user_id === user.id || mat.material_permissions?.some((p: any) => p.user_id === user.id && p.can_share),
    }));

    return NextResponse.json({ 
      materials: enrichedMaterials,
      permissions: permissions 
    }, { headers: corsHeaders(origin) });
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

    // Get user and check permissions
    const { data: user } = await supabase
      .from('users')
      .select('id, organization_id, role')
      .eq('email', session.user.email)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404, headers: corsHeaders(origin) });
    }

    // Check upload permission
    const { data: permissions } = await supabase
      .from('user_permissions')
      .select('can_upload_materials')
      .eq('user_id', user.id)
      .eq('organization_id', user.organization_id)
      .maybeSingle();

    if (!permissions?.can_upload_materials && user.role !== 'org_admin' && user.role !== 'super_admin') {
      return NextResponse.json({ 
        error: 'You do not have permission to upload materials' 
      }, { status: 403, headers: corsHeaders(origin) });
    }

    // Upload file to Supabase Storage (in user's folder)
    const fileName = `${user.id}/${Date.now()}-${file.name}`;
    
    // Get the file extension to determine content type
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    
    // Map file extensions to MIME types (handle Excel explicitly)
    const contentTypeMap: Record<string, string> = {
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'xls': 'application/vnd.ms-excel',
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'doc': 'application/msword',
      'txt': 'text/plain',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    };
    
    const contentType = contentTypeMap[fileExt || ''] || file.type || 'application/octet-stream';
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('sales-materials')
      .upload(fileName, file, {
        contentType: contentType,
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file: ' + uploadError.message }, { status: 500, headers: corsHeaders(origin) });
    }

    // Get public URL (bucket is public for now)
    const { data: urlData } = supabase.storage
      .from('sales-materials')
      .getPublicUrl(fileName);
    
    if (!urlData?.publicUrl) {
      console.error('Failed to get file URL');
      return NextResponse.json({ error: 'Failed to get file URL' }, { status: 500, headers: corsHeaders(origin) });
    }

    // Extract text from file based on file type
    let fileText = '';
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'txt';
    const fileType = ['pdf', 'docx', 'txt', 'pptx', 'doc', 'xlsx', 'xls'].includes(fileExt) ? fileExt : 'txt';

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      switch (fileType) {
        case 'pdf':
          try {
            console.log('📄 Extracting text from PDF...');
            const buffer = Buffer.from(arrayBuffer);
            const pdfData = await pdf(buffer);
            fileText = pdfData.text;
            console.log(`✅ Extracted ${fileText.length} characters from PDF`);
          } catch (pdfError) {
            console.error('PDF extraction error:', pdfError);
            fileText = 'PDF uploaded but text extraction failed. File is stored and can be referenced by name.';
          }
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
        case 'xlsx':
        case 'xls':
          try {
            console.log('📊 Extracting data from Excel file...');
            const buffer = Buffer.from(arrayBuffer);
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            
            let excelText = `Excel Spreadsheet: ${file.name}\n\n`;
            
            // Process each sheet
            workbook.SheetNames.forEach((sheetName, sheetIndex) => {
              const sheet = workbook.Sheets[sheetName];
              
              // Get the range of the sheet
              const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
              
              excelText += `=== Sheet ${sheetIndex + 1}: ${sheetName} ===\n\n`;
              
              // Convert sheet to array of arrays for better structure
              const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
              
              if (data.length === 0) {
                excelText += '(Empty sheet)\n\n';
                return;
              }
              
              // Get headers (first row)
              const headers = data[0] || [];
              const hasHeaders = headers.some((h: any) => h !== undefined && h !== null && h !== '');
              
              if (hasHeaders) {
                excelText += `Columns: ${headers.map((h: any) => h || '(empty)').join(' | ')}\n`;
                excelText += '-'.repeat(80) + '\n';
              }
              
              // Process data rows (skip header if it exists)
              const startRow = hasHeaders ? 1 : 0;
              const maxRows = Math.min(data.length, startRow + 1000); // Limit to 1000 rows for performance
              
              for (let i = startRow; i < maxRows; i++) {
                const row = data[i];
                if (!row || row.every((cell: any) => cell === undefined || cell === null || cell === '')) {
                  continue; // Skip empty rows
                }
                
                if (hasHeaders) {
                  // Format as key-value pairs
                  const rowData = headers.map((header: any, idx: number) => {
                    const value = row[idx];
                    if (value === undefined || value === null || value === '') return null;
                    return `${header || `Col${idx + 1}`}: ${value}`;
                  }).filter(Boolean).join(' | ');
                  
                  if (rowData) {
                    excelText += `Row ${i}: ${rowData}\n`;
                  }
                } else {
                  // Format as simple row data
                  const rowData = row.map((cell: any, idx: number) => {
                    if (cell === undefined || cell === null || cell === '') return null;
                    return `${cell}`;
                  }).filter(Boolean).join(' | ');
                  
                  if (rowData) {
                    excelText += `Row ${i + 1}: ${rowData}\n`;
                  }
                }
              }
              
              if (data.length > maxRows) {
                excelText += `\n... (${data.length - maxRows} more rows not shown for performance)\n`;
              }
              
              excelText += '\n';
            });
            
            fileText = excelText;
            console.log(`✅ Extracted ${fileText.length} characters from Excel file with ${workbook.SheetNames.length} sheet(s)`);
          } catch (excelError) {
            console.error('Excel extraction error:', excelError);
            fileText = `Excel file uploaded: ${file.name}. Text extraction failed but file is stored and can be referenced by name.`;
          }
          break;
        default:
          fileText = await file.text().catch(() => '');
      }
    } catch (error) {
      console.error('Error extracting text from file:', error);
      fileText = 'Error extracting text from file.';
    }

    // Save to database with default visibility as private
    const { data: material, error: dbError } = await supabase
      .from('sales_materials')
      .insert({
        user_id: user.id,
        organization_id: user.organization_id,
        file_name: file.name,
        file_type: fileType === 'doc' ? 'docx' : fileType === 'xls' ? 'xlsx' : fileType, // Store .doc as .docx and .xls as .xlsx in database
        file_size: file.size,
        file_url: urlData.publicUrl,
        extracted_text: fileText.substring(0, 50000), // Limit to 50k chars
        description: description || null,
        category: category || 'other',
        visibility: 'private', // Default to private
        tags: []
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

    // Get user and permissions
    const { data: user } = await supabase
      .from('users')
      .select('id, organization_id, role')
      .eq('email', session.user.email)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404, headers: corsHeaders(origin) });
    }

    // Check if user has permission to delete this material
    const { data: material } = await supabase
      .from('sales_materials')
      .select('user_id, file_url')
      .eq('id', materialId)
      .maybeSingle();

    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404, headers: corsHeaders(origin) });
    }

    const isOwner = material.user_id === user.id;
    const { data: permissions } = await supabase
      .from('user_permissions')
      .select('can_delete_own_materials, can_delete_org_materials')
      .eq('user_id', user.id)
      .eq('organization_id', user.organization_id)
      .maybeSingle();

    const canDelete = isOwner && permissions?.can_delete_own_materials ||
                      !isOwner && permissions?.can_delete_org_materials && (user.role === 'org_admin' || user.role === 'super_admin');

    if (!canDelete) {
      return NextResponse.json({ 
        error: 'You do not have permission to delete this material' 
      }, { status: 403, headers: corsHeaders(origin) });
    }

    // Delete from database (RLS will handle additional checks)
    const { error } = await supabase
      .from('sales_materials')
      .delete()
      .eq('id', materialId);

    if (error) {
      console.error('Error deleting material:', error);
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders(origin) });
    }

    // Delete from storage
    try {
      const filePath = material.file_url.split('/').slice(-2).join('/'); // Extract path from URL
      await supabase.storage
        .from('sales-materials')
        .remove([filePath]);
    } catch (storageError) {
      console.error('Error deleting from storage:', storageError);
      // Don't fail the request if storage deletion fails
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders(origin) });
  } catch (error) {
    console.error('Error in DELETE /api/sales-materials:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders() });
  }
}

