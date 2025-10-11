import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function OPTIONS() {
  return NextResponse.json({}, { 
    status: 200, 
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { profileData, linkedinUrl, authToken } = body;

    if (!profileData || !linkedinUrl) {
      return NextResponse.json(
        { error: 'profileData and linkedinUrl are required' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // Verify auth token if provided
    let user = null;
    if (authToken) {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(authToken);
      if (authError || !authUser) {
        return NextResponse.json(
          { error: 'Invalid authentication token' },
          { 
            status: 401,
            headers: {
              'Access-Control-Allow-Origin': '*',
            }
          }
        );
      }
      user = authUser;
    }

    // If no auth token, create or find user by email (for anonymous usage)
    if (!user) {
      // Try to find existing user by email from profile data
      const email = profileData.email || 'anonymous@example.com';
      
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (existingUser) {
        user = existingUser;
      } else {
        // Create anonymous user
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            email: email,
            full_name: profileData.name || 'Anonymous User',
            role: 'member'
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating user:', createError);
          return NextResponse.json(
            { error: 'Failed to create user record' },
            { 
              status: 500,
              headers: {
                'Access-Control-Allow-Origin': '*',
              }
            }
          );
        }
        user = newUser;
      }
    }

    // Save LinkedIn analysis to database
    const { data: analysis, error: saveError } = await supabase
      .from('linkedin_analyses')
      .insert({
        user_id: user.id,
        linkedin_url: linkedinUrl,
        profile_name: profileData.name || 'Unknown',
        profile_headline: profileData.headline || null,
        profile_data: profileData,
        ai_analysis: null, // Will be populated by AI analysis
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving LinkedIn analysis:', saveError);
      return NextResponse.json(
        { error: 'Failed to save LinkedIn analysis' },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    console.log('✅ LinkedIn analysis saved successfully:', analysis.id);

    return NextResponse.json({
      success: true,
      analysisId: analysis.id,
      message: 'LinkedIn analysis saved successfully'
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (error) {
    console.error('Error in LinkedIn analysis endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
}
