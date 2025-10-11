import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { createClient } from '@supabase/supabase-js';
import { searchPersonInSalesforce, createSalesforceContact, SalesforceSearchResult } from '@/lib/salesforce';
import { scrapeLinkedInProfile } from '@/lib/linkedin-scraper';

// Create Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders() });
}

export async function GET(req: NextRequest) {
  try {
    const origin = req.headers.get('origin') || '';
    if (!isAllowedOrigin(origin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders(origin) });
    }
    // Placeholder: fetch prospects (later from DB/3rd party)
    return NextResponse.json({ ok: true, prospects: [] }, { headers: corsHeaders(origin) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders() });
  }
}

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get('origin') || '';
    if (!isAllowedOrigin(origin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders(origin) });
    }

    const body = await req.json();
    const { profileData: providedProfileData, linkedinUrl, action = 'analyze', userContext, emailContext } = body;

    // If no profile data is provided but we have a LinkedIn URL, scrape it
    let profileData = providedProfileData;
    
    if (!profileData && linkedinUrl) {
      console.log('No profile data provided, attempting to scrape LinkedIn URL:', linkedinUrl);
      try {
        profileData = await scrapeLinkedInProfile(linkedinUrl);
        console.log('Successfully scraped LinkedIn profile:', profileData.name);
      } catch (scrapeError) {
        console.error('Failed to scrape LinkedIn profile:', scrapeError);
        return NextResponse.json(
          { 
            error: 'Failed to scrape LinkedIn profile. LinkedIn may be blocking automated access. Please paste the profile content manually or ensure you have a valid LinkedIn session.',
            details: scrapeError instanceof Error ? scrapeError.message : 'Unknown error'
          },
          { status: 400, headers: corsHeaders(origin) }
        );
      }
    }

    if (!profileData) {
      return NextResponse.json(
        { error: 'Either profileData or linkedinUrl is required' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Build context from all available data
    let contextText = '';
    
    if (profileData.name) contextText += `Name: ${profileData.name}\n`;
    if (profileData.headline) contextText += `Headline: ${profileData.headline}\n`;
    if (profileData.location) contextText += `Location: ${profileData.location}\n\n`;
    
    if (profileData.aboutSection) {
      contextText += `About:\n${profileData.aboutSection}\n\n`;
    }
    
    if (profileData.experienceSection) {
      contextText += `Experience:\n${profileData.experienceSection}\n\n`;
    }
    
    if (profileData.educationSection) {
      contextText += `Education:\n${profileData.educationSection}\n\n`;
    }
    
    if (profileData.skillsSection) {
      contextText += `Skills:\n${profileData.skillsSection}\n\n`;
    }
    
    // Add full page text if sections weren't extracted
    if (!profileData.aboutSection && !profileData.experienceSection && profileData.fullPageText) {
      contextText += `Profile Content:\n${profileData.fullPageText.substring(0, 8000)}\n`;
    }

    console.log('Building AI prompt with context length:', contextText.length);

    // Add user context if provided
    let userContextText = '';
    if (userContext?.aboutMe || userContext?.objectives) {
      userContextText = '\n\n**Your Context:**\n';
      if (userContext.aboutMe) {
        userContextText += `About You: ${userContext.aboutMe}\n`;
      }
      if (userContext.objectives) {
        userContextText += `Your Objectives: ${userContext.objectives}\n`;
      }
    }
    
    // Get organization context and add to prompt
    let orgContextText = '';
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('organization_id, organizations(org_context)')
          .eq('id', user.id)
          .single();
        
        if (userData?.organizations?.org_context) {
          const orgCtx = userData.organizations.org_context;
          if (orgCtx.aboutUs || orgCtx.objectives || orgCtx.valueProposition) {
            orgContextText = '\n\n**Your Organization:**\n';
            if (orgCtx.aboutUs) {
              orgContextText += `About Organization: ${orgCtx.aboutUs}\n`;
            }
            if (orgCtx.objectives) {
              orgContextText += `Organization Objectives: ${orgCtx.objectives}\n`;
            }
            if (orgCtx.valueProposition) {
              orgContextText += `Value Proposition: ${orgCtx.valueProposition}\n`;
            }
          }
        }
      }
    }

    // Check Salesforce integration if drafting email
    let salesforceResult: SalesforceSearchResult | null = null;
    let organizationId: string | null = null;
    
    if (action === 'email') {
      // Get user's organization for Salesforce check
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const { data: { user } } = await supabase.auth.getUser(token);
        
        if (user) {
          const { data: userData } = await supabase
            .from('users')
            .select('organization_id')
            .eq('id', user.id)
            .single();
          
          if (userData) {
            organizationId = userData.organization_id;
            
            // Check if Salesforce integration is enabled
            const { data: integration } = await supabase
              .from('organization_integrations')
              .select('is_enabled')
              .eq('organization_id', organizationId)
              .eq('integration_type', 'salesforce')
              .eq('is_enabled', true)
              .single();
            
            if (integration) {
              // Search for the person in Salesforce
              try {
                // Extract email from profile if available
                const emailMatch = profileData.fullPageText?.match(/[\w.-]+@[\w.-]+\.\w+/);
                const email = emailMatch ? emailMatch[0] : undefined;
                
                // Parse name
                const nameParts = profileData.name?.split(' ') || [];
                const firstName = nameParts[0];
                const lastName = nameParts.slice(1).join(' ');
                
                salesforceResult = await searchPersonInSalesforce(organizationId, {
                  email,
                  firstName,
                  lastName,
                  linkedinUrl,
                }, user.id);
                
                console.log('Salesforce search result:', salesforceResult);
              } catch (sfError) {
                console.error('Salesforce search error:', sfError);
                // Continue without Salesforce data if there's an error
              }
            }
          }
        }
      }
    }
    
    // Create different prompts based on action type
    let prompt: string;
    
    if (action === 'email') {
      // Email drafting prompt
      let emailInstructions = '';
      if (emailContext) {
        emailInstructions = `\n\nSpecific Instructions for this Email:\n${emailContext}`;
      }

      // Add Salesforce context if person was found
      let salesforceContext = '';
      if (salesforceResult?.found) {
        const lastInteraction = salesforceResult.lastInteractionDate
          ? new Date(salesforceResult.lastInteractionDate).toLocaleDateString()
          : 'unknown';
        
        salesforceContext = `\n\n**IMPORTANT - Salesforce CRM Context:**
This person EXISTS in your Salesforce CRM as a ${salesforceResult.type}.
Last interaction/update: ${lastInteraction}

This means you have already been in contact or they are in your pipeline. This is a FOLLOW-UP or RE-ENGAGEMENT email, NOT a cold outreach.

Adjust your email accordingly:
- Reference previous interactions or relationship
- Use language like "following up", "reconnecting", "touching base"
- Be warmer and more familiar (you've already made contact)
- Reference any known context from your previous interactions
- Show continuity and build on existing relationship`;
      } else {
        salesforceContext = `\n\n**IMPORTANT - Salesforce CRM Context:**
This person DOES NOT exist in your Salesforce CRM yet.

This is a FIRST CONTACT / COLD OUTREACH email.

Approach accordingly:
- This is your first time reaching out
- Build initial rapport and credibility
- Explain briefly who you are and why you're reaching out
- Keep it fresh and introductory
- Don't assume any prior relationship`;
      }

      prompt = `You are an expert sales email writer. Draft a personalized, professional outreach email to this LinkedIn prospect.

**Prospect's Profile:**
${contextText}
${userContextText}
${orgContextText}
${salesforceContext}
${emailInstructions}

Please draft a complete email with:
- A compelling subject line (adjust based on whether this is first contact or follow-up)
- Personalized greeting
- Opening that references something specific from their profile
- Value proposition that aligns with their role/industry
- Clear but soft call-to-action
- Professional closing

Keep the tone conversational, authentic, and focused on providing value. The email should be 150-200 words. Make it feel personal, not templated.

${salesforceResult?.found ? '**Remember: This is a FOLLOW-UP/RE-ENGAGEMENT email, not a cold email.**' : '**Remember: This is a FIRST CONTACT cold email.**'}

Format your response exactly as follows:

**Subject:** [subject line]

**Email:**
[email body]`;
    } else {
      // Analysis prompt (default)
      prompt = `You are an expert sales intelligence assistant. Analyze this LinkedIn profile and provide insightful, actionable intelligence for a sales professional.

CRITICAL INSTRUCTIONS:
- ONLY use information explicitly provided in the profile data
- DO NOT make assumptions or add details that aren't present
- If information is missing, state "Information not available" rather than guessing
- Focus on factual observations from the profile
- Be conservative with insights - only state what you can clearly infer

**Prospect's Profile:**
${contextText}
${userContextText}
${orgContextText}

Based ONLY on the LinkedIn profile information provided above, please provide:

**1. Executive Summary**
A brief 2-3 sentence overview of who this person is professionally based on the available profile information. Do not add details that aren't explicitly stated.

**2. Key Insights**
3-5 factual observations about their career, expertise, or professional background based on what's actually in their profile. Only mention what is clearly stated.

**3. Sales Angles**
Specific talking points or connection opportunities based on their actual profile content. Reference specific details from their profile.

**4. Potential Pain Points**
Based on their actual role and industry as stated in their profile, what challenges might they logically be facing? Keep this grounded in their stated responsibilities.

**5. Conversation Starters**
2-3 personalized opening lines that reference specific details from their profile. Make them natural and reference actual content from their profile.

Remember: Stick to facts from the profile. If something isn't stated, don't assume it.`;
    }

    // Check if we should use mock mode
    const useMock = process.env.USE_MOCK_AI === '1' || process.env.NEXT_PUBLIC_MOCK_AI === '1';
    
    let analysis: string;

    if (useMock) {
      console.log('🧪 Using MOCK AI response (set USE_MOCK_AI=0 to use real OpenAI)');
      
      // Generate different mock responses based on action type
      if (action === 'email') {
        const firstName = profileData.name?.split(' ')[0] || 'there';
        const workArea = profileData.headline ? profileData.headline.split('|')[0].trim().toLowerCase() : 'your field';
        const locationText = profileData.location ? `Being based in ${profileData.location}, you are ` : 'You are ';
        const industryChallenge = profileData.headline?.includes('AI') ? 'scaling AI solutions' : profileData.headline?.includes('healthcare') ? 'healthcare innovation' : 'your industry';
        const roleType = profileData.headline?.includes('CMO') ? 'marketing leaders' : profileData.headline?.includes('CEO') ? 'executives' : 'professionals like you';
        const userContextIntro = userContext?.aboutMe ? `As someone working in ${userContext.aboutMe.split(',')[0]}, ` : '';
        const objectives = userContext?.objectives || 'achieve their business goals';
        const emailContextText = emailContext ? ` ${emailContext.substring(0, 100)}` : '';
        const workReference = profileData.headline ? ` in ${profileData.headline.toLowerCase()}` : '';
        
        analysis = `**Subject:** ${profileData.name ? `Quick question about ${profileData.headline?.split('|')[0].trim() || 'your work'}` : 'Exploring collaboration opportunities'}

**Email:**

Hi ${firstName},

I came across your profile and was impressed by your work in ${workArea}. ${locationText}likely facing some interesting challenges in ${industryChallenge}.

${userContextIntro}I've been helping ${roleType} ${objectives}.${emailContextText}

Would you be open to a brief call to explore how we might be able to help? I have some specific ideas that could be relevant to your work${workReference}.

Looking forward to connecting!

Best regards

---
*Note: This is a MOCK email generated for testing. To use real AI, add OpenAI credits and set USE_MOCK_AI=0 in your .env.local file.*`;
      } else {
        // Generate analysis mock response
        analysis = `**1. Executive Summary**
${profileData.name || 'This professional'} is ${profileData.headline || 'a professional in their field'}${profileData.location ? ` based in ${profileData.location}` : ''}. They appear to be an experienced professional with a strong background in their industry.

**2. Key Insights**
• Current role suggests leadership experience and strategic thinking
• ${profileData.location ? `Located in ${profileData.location}, which is a major business hub` : 'Operating in a key market area'}
• Active LinkedIn presence with professional networking (${profileData.headline ? 'clearly defined professional identity' : 'established career trajectory'})
• Experience in ${profileData.headline?.includes('AI') ? 'cutting-edge AI/technology sector' : profileData.headline?.includes('healthcare') ? 'healthcare innovation' : 'their specialized field'}
• Likely decision-maker or influencer in their organization

**3. Sales Angles**
• Innovation focus: If in tech/AI, they value cutting-edge solutions
• Efficiency and ROI: Leadership roles prioritize business outcomes
• Industry expertise: They understand sector-specific challenges
• Growth mindset: Active professionals are open to new opportunities
• Network effects: Well-connected professionals can become advocates

**4. Potential Pain Points**
• Scaling challenges as the business grows
• Need for operational efficiency and automation
• Staying competitive in a rapidly evolving market
• Managing team productivity and collaboration
• Balancing innovation with practical implementation
• ROI pressure from stakeholders or investors

**5. Conversation Starters**
• "I noticed you're working on ${profileData.headline ? profileData.headline.split('|')[0].trim() : 'innovative projects'} - I'd love to hear about the biggest challenges you're tackling in that space."

• "${profileData.location ? `I see you're in ${profileData.location} - ` : ''}I've been working with similar ${profileData.headline?.includes('CMO') ? 'marketing leaders' : profileData.headline?.includes('CEO') ? 'executives' : 'professionals'} who've shared some interesting insights about [specific challenge]. Would love to compare notes."

• "Your background in ${profileData.headline ? profileData.headline.toLowerCase().includes('ai') ? 'AI and innovation' : profileData.headline.toLowerCase().includes('healthcare') ? 'healthcare tech' : 'your field' : 'your industry'} is impressive. I'm curious - how are you approaching [relevant industry challenge]?"

---
*Note: This is a MOCK response generated for testing. To use real AI analysis, add OpenAI credits and set USE_MOCK_AI=0 in your .env.local file.*`;
      }
    } else {
      console.log('Sending to OpenAI for analysis...');
      console.log('OpenAI API Key present:', !!process.env.OPENAI_API_KEY);
      console.log('OpenAI API Key prefix:', process.env.OPENAI_API_KEY?.substring(0, 10));
      console.log('Context text length:', contextText.length);

      // Call OpenAI for analysis
      let completion;
      try {
        completion = await openai.responses.create({
          model: 'gpt-5-mini',
          input: prompt + '\n\nIMPORTANT: Format your response using HTML tags instead of markdown. Use <h3> for section headers, <p> for paragraphs, <ul> and <li> for bullet points, and <strong> for bold text.',
          reasoning: {
            effort: "low"
          },
          text: {
            verbosity: "medium"
          },
          max_output_tokens: 1500,
        });
      } catch (openaiError: any) {
        console.error('OpenAI API Error:', {
          message: openaiError.message,
          type: openaiError.type,
          code: openaiError.code,
          status: openaiError.status,
          error: openaiError.error,
        });
        throw new Error(`OpenAI API failed: ${openaiError.message || openaiError.toString()}`);
      }

      analysis = completion.output_text || 'No analysis generated';
      console.log('Analysis complete, length:', analysis.length);
    }

    // Save to database (if user is authenticated)
    try {
      const authHeader = req.headers.get('authorization');
      let userId = null;
      let organizationId = null;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (!error && user) {
          userId = user.id;
          
          // Get user's organization_id
          const { data: userData } = await supabase
            .from('users')
            .select('organization_id')
            .eq('id', userId)
            .single();
          
          organizationId = userData?.organization_id;

          if (action === 'email') {
            // Save email generation
            console.log('Saving email generation to database for user:', userId);
            
            // Parse the email from analysis (format: Subject: ...\n\nBody: ...)
            let subject = '';
            let body = analysis;
            
            const subjectMatch = analysis.match(/Subject:\s*(.+?)(?:\n|$)/i);
            if (subjectMatch) {
              subject = subjectMatch[1].trim();
              // Remove subject line from body
              body = analysis.replace(/Subject:\s*.+?(?:\n|$)/i, '').trim();
              // Remove "Body:" prefix if present
              body = body.replace(/^Body:\s*/i, '').trim();
            }
            
            const { error: insertError } = await supabase
              .from('email_generations')
              .insert({
                user_id: userId,
                organization_id: organizationId,
                linkedin_url: linkedinUrl,
                profile_name: profileData.name,
                subject: subject,
                body: body,
                email_context: emailContext || null,
              });

            if (insertError) {
              console.error('Error saving email generation:', insertError);
            } else {
              console.log('Email generation saved successfully');
            }

            // Auto-create Salesforce contact if person doesn't exist and integration is enabled
            if (organizationId && salesforceResult && !salesforceResult.found) {
              try {
                const { data: integration } = await supabase
                  .from('organization_integrations')
                  .select('is_enabled')
                  .eq('organization_id', organizationId)
                  .eq('integration_type', 'salesforce')
                  .eq('is_enabled', true)
                  .single();

                if (integration) {
                  console.log('Creating new Salesforce contact for:', profileData.name);
                  
                  // Extract email from profile
                  const emailMatch = profileData.fullPageText?.match(/[\w.-]+@[\w.-]+\.\w+/);
                  const email = emailMatch ? emailMatch[0] : undefined;
                  
                  // Parse name
                  const nameParts = profileData.name?.split(' ') || [];
                  const firstName = nameParts[0] || 'Unknown';
                  const lastName = nameParts.slice(1).join(' ') || 'Prospect';
                  
                  // Extract company from headline (common pattern: "Title at Company")
                  let company = 'Unknown';
                  if (profileData.headline) {
                    const companyMatch = profileData.headline.match(/(?:at|@)\s+([^|,]+)/i);
                    if (companyMatch) {
                      company = companyMatch[1].trim();
                    }
                  }
                  
                  const contactResult = await createSalesforceContact(organizationId, {
                    firstName,
                    lastName,
                    email,
                    title: profileData.headline,
                    company,
                    linkedinUrl,
                    description: `LinkedIn prospect - Auto-added from Sales Curiosity extension\n\nProfile: ${linkedinUrl}\nAdded: ${new Date().toISOString()}`,
                  }, userId);
                  
                  console.log('Salesforce contact created:', contactResult.id);
                }
              } catch (sfError) {
                console.error('Error auto-creating Salesforce contact:', sfError);
                // Don't fail the whole request if Salesforce creation fails
              }
            }
          } else {
            // Save profile analysis
            console.log('Saving analysis to database for user:', userId);
            
            const { error: insertError } = await supabase
              .from('linkedin_analyses')
              .insert({
                user_id: userId,
                organization_id: organizationId,
                linkedin_url: linkedinUrl,
                profile_name: profileData.name,
                profile_headline: profileData.headline,
                profile_location: profileData.location,
                profile_data: profileData,
                ai_analysis: analysis,
              });

            if (insertError) {
              console.error('Error saving analysis:', insertError);
            } else {
              console.log('Analysis saved successfully');
            }
          }
        } else {
          console.log('Invalid auth token');
        }
      } else {
        console.log('No auth token provided, skipping database save');
      }
    } catch (dbError) {
      console.error('Database save error:', dbError);
      // Don't throw - we still want to return the analysis even if save fails
    }

    return NextResponse.json(
      {
        ok: true,
        analysis,
        profileData: {
          name: profileData.name,
          headline: profileData.headline,
          location: profileData.location,
          url: linkedinUrl,
        },
        salesforceStatus: salesforceResult ? {
          found: salesforceResult.found,
          type: salesforceResult.type,
          inCRM: salesforceResult.found,
        } : null,
      },
      { headers: corsHeaders(origin) }
    );
  } catch (err) {
    console.error('Error analyzing prospect:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', details: String(err) },
      { status: 500, headers: corsHeaders() }
    );
  }
}

function isAllowedOrigin(origin: string) {
  const allowed = ['chrome-extension://', process.env.NEXT_PUBLIC_APP_URL || '', 'https://your-app.vercel.app'];
  return allowed.some((prefix) => origin.startsWith(prefix));
}

function corsHeaders(origin?: string) {
  const o = origin || '*';
  return {
    'Access-Control-Allow-Origin': o,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  } as Record<string, string>;
}


