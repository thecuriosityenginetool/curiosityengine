import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth';

function corsHeaders(origin?: string) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function isAllowedOrigin(origin: string | null) {
  if (!origin) return true;
  const allowed = [
    'chrome-extension://',
    process.env.NEXT_PUBLIC_APP_URL || '',
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

// POST - Share material with organization or specific users
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { materialId, visibility, userIds } = body;

    if (!materialId || !visibility) {
      return NextResponse.json(
        { error: 'materialId and visibility are required' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id, organization_id, role')
      .eq('email', session.user.email)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404, headers: corsHeaders(origin) });
    }

    // Check if user owns this material or has permission to share
    const { data: material } = await supabase
      .from('sales_materials')
      .select('user_id, organization_id')
      .eq('id', materialId)
      .maybeSingle();

    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404, headers: corsHeaders(origin) });
    }

    if (material.user_id !== user.id) {
      return NextResponse.json({ 
        error: 'You can only share your own materials' 
      }, { status: 403, headers: corsHeaders(origin) });
    }

    // Check sharing permission
    const { data: permissions } = await supabase
      .from('user_permissions')
      .select('can_share_materials')
      .eq('user_id', user.id)
      .eq('organization_id', user.organization_id)
      .maybeSingle();

    if (!permissions?.can_share_materials && user.role !== 'org_admin' && user.role !== 'super_admin') {
      return NextResponse.json({ 
        error: 'You do not have permission to share materials' 
      }, { status: 403, headers: corsHeaders(origin) });
    }

    if (visibility === 'organization') {
      // Share with entire organization using the helper function
      const { error: shareError } = await supabase.rpc('share_material_with_org', {
        p_material_id: materialId,
        p_visibility: 'organization'
      });

      if (shareError) {
        console.error('Error sharing with org:', shareError);
        return NextResponse.json({ error: shareError.message }, { status: 500, headers: corsHeaders(origin) });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Material shared with organization' 
      }, { headers: corsHeaders(origin) });
    }

    if (visibility === 'team' && userIds && userIds.length > 0) {
      // Share with specific users using the helper function
      const { error: shareError } = await supabase.rpc('share_material_with_users', {
        p_material_id: materialId,
        p_user_ids: userIds
      });

      if (shareError) {
        console.error('Error sharing with users:', shareError);
        return NextResponse.json({ error: shareError.message }, { status: 500, headers: corsHeaders(origin) });
      }

      return NextResponse.json({ 
        success: true, 
        message: `Material shared with ${userIds.length} user(s)` 
      }, { headers: corsHeaders(origin) });
    }

    if (visibility === 'private') {
      // Make material private again
      const { error: updateError } = await supabase
        .from('sales_materials')
        .update({
          visibility: 'private',
          shared_by: null,
          shared_at: null
        })
        .eq('id', materialId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error making material private:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500, headers: corsHeaders(origin) });
      }

      // Remove all permissions for this material
      await supabase
        .from('material_permissions')
        .delete()
        .eq('material_id', materialId);

      return NextResponse.json({ 
        success: true, 
        message: 'Material is now private' 
      }, { headers: corsHeaders(origin) });
    }

    return NextResponse.json({ 
      error: 'Invalid visibility option' 
    }, { status: 400, headers: corsHeaders(origin) });

  } catch (error) {
    console.error('Error in POST /api/sales-materials/share:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders() });
  }
}

