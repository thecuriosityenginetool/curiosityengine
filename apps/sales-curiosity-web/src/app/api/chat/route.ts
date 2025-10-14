import { NextRequest } from 'next/server';
import { openai } from '@/lib/openai';
import { auth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { salesforceTools } from '@/lib/salesforce-tools';
import { outlookTools } from '@/lib/outlook-tools';
import { 
  searchPersonInSalesforce, 
  createSalesforceLead, 
  createSalesforceContact,
  updateSalesforceContact,
  updateSalesforceLead,
  addSalesforceNote,
  createSalesforceTask,
  getRecentActivity,
  querySalesforce
} from '@/lib/salesforce';
import {
  createOutlookDraft,
  sendOutlookEmail,
  createOutlookCalendarEvent
} from '@/lib/outlook';
import { matchCalendarEventsToSalesforce, buildCalendarContext } from '@/lib/calendar-matcher';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Execute CRM and Email tool calls
 */
async function executeTool(
  toolName: string,
  args: any,
  organizationId: string,
  userId: string
): Promise<string> {
  try {
    // Salesforce tools
    switch (toolName) {
      case 'search_salesforce': {
        const result = await searchPersonInSalesforce(organizationId, args, userId);
        if (result.found && result.data) {
          const record = result.data;
          return `Found ${result.type}: ${record.FirstName} ${record.LastName}
Email: ${record.Email || 'N/A'}
Title: ${record.Title || 'N/A'}
Company: ${(record as any).Company || record.Account?.Name || 'N/A'}
Last Modified: ${record.LastModifiedDate}
Record ID: ${record.Id}`;
        }
        return `No contact or lead found matching the search criteria.`;
      }

      case 'create_lead': {
        const result = await createSalesforceLead(organizationId, args, userId);
        return `✅ Lead created successfully!
Name: ${args.firstName} ${args.lastName}
Company: ${args.company}
Record ID: ${result.id}`;
      }

      case 'create_contact': {
        const result = await createSalesforceContact(organizationId, args, userId);
        return `✅ Contact created successfully!
Name: ${args.firstName} ${args.lastName}
${args.company ? `Company: ${args.company}` : ''}
Record ID: ${result.id}`;
      }

      case 'update_record': {
        if (args.recordType === 'Contact') {
          await updateSalesforceContact(organizationId, args.recordId, args.updates, userId);
        } else {
          await updateSalesforceLead(organizationId, args.recordId, args.updates, userId);
        }
        return `✅ ${args.recordType} updated successfully!
Updated fields: ${Object.keys(args.updates).join(', ')}`;
      }

      case 'add_note': {
        const result = await addSalesforceNote(organizationId, args.recordId, args.note);
        return `✅ Note added successfully!
Note ID: ${result.id}`;
      }

      case 'create_task': {
        const result = await createSalesforceTask(organizationId, {
          WhoId: args.recordId,
          Subject: args.subject,
          Description: args.description,
          Priority: args.priority,
          ActivityDate: args.dueDate,
        }, userId);
        return `✅ Task created successfully!
Subject: ${args.subject}
${args.dueDate ? `Due: ${args.dueDate}` : ''}
Task ID: ${result.id}`;
      }

      case 'get_activity': {
        const activity = await getRecentActivity(organizationId, args.recordId, userId);
        let response = 'Recent Activity:\n\n';
        
        if (activity.tasks.length > 0) {
          response += `📋 Tasks (${activity.tasks.length}):\n`;
          activity.tasks.slice(0, 5).forEach((task: any) => {
            response += `- ${task.Subject} (${task.Status}) - ${new Date(task.CreatedDate).toLocaleDateString()}\n`;
          });
          response += '\n';
        }
        
        if (activity.events.length > 0) {
          response += `📅 Events (${activity.events.length}):\n`;
          activity.events.slice(0, 5).forEach((event: any) => {
            response += `- ${event.Subject} - ${new Date(event.StartDateTime).toLocaleDateString()}\n`;
          });
          response += '\n';
        }
        
        if (activity.notes.length > 0) {
          response += `📝 Notes (${activity.notes.length}):\n`;
          activity.notes.slice(0, 3).forEach((note: any) => {
            response += `- ${note.Title} - ${new Date(note.CreatedDate).toLocaleDateString()}\n`;
          });
        }
        
        return response || 'No recent activity found.';
      }

      case 'query_crm': {
        const result = await querySalesforce(organizationId, args.query, userId);
        if (result.records && result.records.length > 0) {
          return `Found ${result.totalSize} record(s):\n${JSON.stringify(result.records, null, 2)}`;
        }
        return 'No records found matching the query.';
      }

      // Outlook tools
      case 'create_email_draft': {
        const result = await createOutlookDraft(organizationId, {
          to: args.to,
          subject: args.subject,
          body: args.body
        }, userId);
        return `✅ Email draft created successfully in Outlook!
To: ${args.to}
Subject: ${args.subject}
Draft ID: ${result.id}

The draft is now in your Outlook Drafts folder and ready to send.`;
      }

      case 'send_email': {
        await sendOutlookEmail(organizationId, {
          to: args.to,
          subject: args.subject,
          body: args.body
        }, userId);
        return `✅ Email sent successfully via Outlook!
To: ${args.to}
Subject: ${args.subject}

The email has been sent and saved to your Sent Items.`;
      }

      case 'create_calendar_event': {
        const result = await createOutlookCalendarEvent(organizationId, {
          subject: args.title,
          start: args.start,
          end: args.end,
          body: args.description,
          attendees: args.attendees,
          location: args.location
        }, userId);
        return `✅ Calendar event created successfully in Outlook!
Title: ${args.title}
Start: ${new Date(args.start).toLocaleString()}
End: ${new Date(args.end).toLocaleString()}
${args.attendees ? `Attendees: ${args.attendees.join(', ')}` : ''}
Event ID: ${result.id}`;
      }

      default:
        return `Unknown tool: ${toolName}`;
    }
  } catch (error) {
    console.error(`Error executing ${toolName}:`, error);
    return `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return new Response(
        encoder.encode(JSON.stringify({ error: 'Unauthorized' })),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { message, conversationHistory = [], userContext, calendarEvents = [] } = await req.json();

    if (!message) {
      return new Response(
        encoder.encode(JSON.stringify({ error: 'Message is required' })),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile with company info
    const { data: user } = await supabase
      .from('users')
      .select('id, full_name, job_title, company_name, company_url, organization_id')
      .eq('email', session.user.email)
      .maybeSingle();

    if (!user) {
      return new Response(
        encoder.encode(JSON.stringify({ error: 'User not found' })),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if Salesforce is enabled (check both 'salesforce' and 'salesforce_user')
    const { data: salesforceIntegration } = await supabase
      .from('organization_integrations')
      .select('is_enabled')
      .eq('organization_id', user.organization_id)
      .in('integration_type', ['salesforce', 'salesforce_user'])
      .eq('is_enabled', true)
      .maybeSingle();

    const hasSalesforce = !!salesforceIntegration;
    
    console.log('🔍 Salesforce integration check:', {
      organizationId: user.organization_id,
      hasSalesforce,
      integration: salesforceIntegration
    });

    // Check if Outlook is enabled
    const { data: outlookIntegration } = await supabase
      .from('organization_integrations')
      .select('is_enabled')
      .eq('organization_id', user.organization_id)
      .in('integration_type', ['outlook', 'outlook_user'])
      .eq('is_enabled', true)
      .maybeSingle();

    const hasOutlook = !!outlookIntegration;
    
    console.log('📧 Outlook integration check:', {
      organizationId: user.organization_id,
      hasOutlook,
      integration: outlookIntegration
    });

    // Combine available tools
    const availableTools = [
      ...(hasSalesforce ? salesforceTools : []),
      ...(hasOutlook ? outlookTools : [])
    ];

    // Get sales materials for context
    let salesMaterials = '';
    const { data: materials } = await supabase
      .from('sales_materials')
      .select('file_name, extracted_text, category')
      .eq('user_id', user.id)
      .limit(5);

    if (materials && materials.length > 0) {
      salesMaterials = '\n\nSales Materials & Company Guides:\n' + materials.map(m => 
        `[${m.category}] ${m.file_name}:\n${m.extracted_text?.substring(0, 1000) || 'No text extracted'}...`
      ).join('\n\n');
    }

    // Match calendar events to Salesforce if available
    let calendarContext = '';
    if (hasSalesforce && calendarEvents.length > 0) {
      try {
        const enrichedEvents = await matchCalendarEventsToSalesforce(
          calendarEvents,
          user.organization_id,
          user.id
        );
        calendarContext = '\n\n' + buildCalendarContext(enrichedEvents);
      } catch (error) {
        console.error('Error matching calendar events:', error);
        // Fall back to simple calendar display
        calendarContext = `\n\nUpcoming Calendar Events:\n${calendarEvents.map((event: any) => 
          `- ${event.title} at ${event.start} ${event.description ? '(' + event.description + ')' : ''}`
        ).join('\n')}`;
      }
    } else if (calendarEvents.length > 0) {
      calendarContext = `\n\nUpcoming Calendar Events:\n${calendarEvents.map((event: any) => 
        `- ${event.title} at ${event.start} ${event.description ? '(' + event.description + ')' : ''}`
      ).join('\n')}`;
    }

    // Build system prompt with context - ONLY mention connected integrations
    let systemPrompt = `You are Curiosity Engine, an AI sales assistant. You help sales professionals by:`;

    if (hasSalesforce) {
      systemPrompt += `
✅ Salesforce CRM is connected. You can:
- Search, create, update contacts and leads
- Add notes and create tasks
- View activity and CRM data
- Analyze calendar events and match them to CRM records`;
    }

    if (hasOutlook) {
      systemPrompt += `
✅ Outlook is connected. You can:
- Create email drafts in Outlook (ALWAYS use create_email_draft tool when user asks for email drafts)
- Send emails via Outlook
- Create calendar events in Outlook`;
    }

    if (!hasSalesforce && !hasOutlook) {
      systemPrompt += `
⚠️ No integrations connected. You can only provide general sales advice and insights.`;
    }

    systemPrompt += `

Be concise, professional, and action-oriented. When creating email drafts, ALWAYS use the create_email_draft tool to save them to Outlook.`;

    // Add user profile context
    systemPrompt += `\n\nUser Profile:
- Name: ${user.full_name || 'Not set'}
- Role: ${user.job_title || 'Not set'}
- Company: ${user.company_name || 'Not set'}
- Website: ${user.company_url || 'Not set'}`;

    if (userContext) {
      systemPrompt += `\n\nUser Context:\n${JSON.stringify(userContext, null, 2)}`;
    }

    if (salesMaterials) {
      systemPrompt += salesMaterials;
    }

    if (calendarContext) {
      systemPrompt += calendarContext;
    }

    // Build messages array
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Call OpenAI with streaming and tools
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages,
            tools: hasSalesforce ? salesforceTools : undefined,
            tool_choice: hasSalesforce ? 'auto' : undefined,
            stream: true,
            max_tokens: 2000,
          });

          let toolCalls: any[] = [];
          let currentToolCall: any = null;

          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta;

            // Handle tool calls
            if (delta?.tool_calls) {
              for (const toolCall of delta.tool_calls) {
                if (toolCall.index !== undefined) {
                  if (!toolCalls[toolCall.index]) {
                    toolCalls[toolCall.index] = {
                      id: toolCall.id || '',
                      type: 'function',
                      function: { name: '', arguments: '' }
                    };
                    currentToolCall = toolCalls[toolCall.index];
                  } else {
                    currentToolCall = toolCalls[toolCall.index];
                  }

                  if (toolCall.function?.name) {
                    currentToolCall.function.name += toolCall.function.name;
                    // Send tool indicator to client
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({
                        type: 'tool_start',
                        tool: toolCall.function.name
                      })}\n\n`)
                    );
                  }

                  if (toolCall.function?.arguments) {
                    currentToolCall.function.arguments += toolCall.function.arguments;
                  }
                }
              }
            }

            // Handle regular content
            if (delta?.content) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: 'content',
                  content: delta.content
                })}\n\n`)
              );
            }

            // Handle finish
            if (chunk.choices[0]?.finish_reason === 'tool_calls') {
              // Execute tool calls
              for (const toolCall of toolCalls) {
                const toolName = toolCall.function.name;
                const toolArgs = JSON.parse(toolCall.function.arguments);

                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    type: 'tool_executing',
                    tool: toolName
                  })}\n\n`)
                );

                const result = await executeSalesforceTool(
                  toolName,
                  toolArgs,
                  user.organization_id,
                  user.id
                );

                // Add tool result to messages and continue
                messages.push({
                  role: 'assistant',
                  content: null,
                  tool_calls: [toolCall]
                });
                messages.push({
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  content: result
                });

                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    type: 'tool_result',
                    tool: toolName,
                    result: result
                  })}\n\n`)
                );
              }

              // Make another completion call with tool results
              const followUpCompletion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages,
                stream: true,
                max_tokens: 1500,
              });

              for await (const followUpChunk of followUpCompletion) {
                const followUpDelta = followUpChunk.choices[0]?.delta;
                if (followUpDelta?.content) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({
                      type: 'content',
                      content: followUpDelta.content
                    })}\n\n`)
                  );
                }

                if (followUpChunk.choices[0]?.finish_reason === 'stop') {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
                }
              }
              break;
            }

            if (chunk.choices[0]?.finish_reason === 'stop') {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
            }
          }

          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              error: error instanceof Error ? error.message : 'Unknown error'
            })}\n\n`)
          );
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      encoder.encode(JSON.stringify({
        error: 'Failed to process chat message',
        details: error instanceof Error ? error.message : 'Unknown error'
      })),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
