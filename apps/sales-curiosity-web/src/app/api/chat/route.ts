import { NextRequest } from 'next/server';
import { openai } from '@/lib/openai';
import { auth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { salesforceTools } from '@/lib/salesforce-tools';
import { outlookTools } from '@/lib/outlook-tools';
import { gmailTools } from '@/lib/gmail-tools';
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
  createOutlookCalendarEvent,
  getRecentEmails,
  searchEmails
} from '@/lib/outlook';
import {
  createGmailDraft,
  sendGmailEmail,
  createGoogleCalendarEvent,
  searchGmailEmails,
  searchGoogleCalendarEvents
} from '@/lib/gmail';
import { matchCalendarEventsToSalesforce, buildCalendarContext } from '@/lib/calendar-matcher';

// LangGraph imports
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createAgentTools } from '@/lib/langgraph-tools';
import { invokeAgent } from '@/lib/langgraph-agent';
import { selectModel } from '@/lib/model-router';

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

      // Gmail tools
      case 'create_gmail_draft': {
        const result = await createGmailDraft(organizationId, {
          to: args.to,
          subject: args.subject,
          body: args.body
        }, userId);
        return `✅ Email draft created successfully in Gmail!
To: ${args.to}
Subject: ${args.subject}
Draft ID: ${result.id}

The draft is now in your Gmail Drafts folder and ready to send.`;
      }

      case 'send_gmail_email': {
        await sendGmailEmail(organizationId, {
          to: args.to,
          subject: args.subject,
          body: args.body
        }, userId);
        return `✅ Email sent successfully via Gmail!
To: ${args.to}
Subject: ${args.subject}

The email has been sent.`;
      }

      case 'create_google_calendar_event': {
        const result = await createGoogleCalendarEvent(organizationId, {
          summary: args.title,
          start: args.start,
          end: args.end,
          description: args.description,
          attendees: args.attendees,
          location: args.location
        }, userId);
        return `✅ Calendar event created successfully in Google Calendar!
Title: ${args.title}
Start: ${new Date(args.start).toLocaleString()}
End: ${new Date(args.end).toLocaleString()}
${args.attendees ? `Attendees: ${args.attendees.join(', ')}` : ''}
Event ID: ${result.id}`;
      }

      case 'search_gmail_emails': {
        const emails = await searchGmailEmails(organizationId, args.query, userId, args.maxResults || 10);
        if (emails.length === 0) {
          return `No emails found matching "${args.query}"`;
        }

        const emailList = emails.map((email: any) => {
          const headers = email.payload?.headers || [];
          const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
          const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No subject';
          const date = headers.find((h: any) => h.name === 'Date')?.value || '';
          const snippet = email.snippet || '';
          
          return `From: ${from}
Subject: ${subject}
Date: ${date}
Preview: ${snippet}
---`;
        }).join('\n\n');

        return `Found ${emails.length} email(s) matching "${args.query}":

${emailList}`;
      }

      case 'search_calendar_events': {
        const events = await searchGoogleCalendarEvents(organizationId, args.query, userId, {
          startDate: args.startDate,
          endDate: args.endDate,
          maxResults: args.maxResults
        });
        
        if (events.length === 0) {
          return `No calendar events found matching "${args.query}"`;
        }

        const eventList = events.map((event: any) => {
          const start = event.start?.dateTime || event.start?.date;
          const end = event.end?.dateTime || event.end?.date;
          const attendees = event.attendees?.map((a: any) => a.email).join(', ') || 'No attendees';
          
          return `📅 ${event.summary}
When: ${new Date(start).toLocaleString()} - ${new Date(end).toLocaleString()}
${event.location ? `Location: ${event.location}` : ''}
${event.description ? `Description: ${event.description}` : ''}
Attendees: ${attendees}
---`;
        }).join('\n\n');

        return `Found ${events.length} calendar event(s) matching "${args.query}":

${eventList}`;
      }

      case 'search_emails': {
        const emails = await searchEmails(organizationId, args.query, userId, args.limit || 5);
        if (emails.length === 0) {
          return `No emails found matching "${args.query}"`;
        }
        
        let response = `Found ${emails.length} email(s) matching "${args.query}":\n\n`;
        emails.forEach((email: any, index: number) => {
          const from = email.from?.emailAddress?.name || email.from?.emailAddress?.address || 'Unknown';
          const subject = email.subject || '(No subject)';
          const date = new Date(email.receivedDateTime).toLocaleString();
          const preview = email.bodyPreview?.substring(0, 150) || '';
          
          response += `${index + 1}. From: ${from}\n`;
          response += `   Subject: ${subject}\n`;
          response += `   Date: ${date}\n`;
          response += `   Preview: ${preview}...\n\n`;
        });
        
        return response;
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
    console.log('🤖 [Chat API] Request received');
    const session = await auth();
    console.log('🤖 [Chat API] Session check:', session ? 'Valid' : 'None');
    
    if (!session?.user?.email) {
      return new Response(
        encoder.encode(JSON.stringify({ error: 'Unauthorized' })),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('🤖 [Chat API] Parsing request body...');
    const { message, conversationHistory = [], userContext, calendarEvents = [], model } = await req.json();
    console.log('🤖 [Chat API] Request parsed:', { hasMessage: !!message, eventsCount: calendarEvents.length });

    if (!message) {
      return new Response(
        encoder.encode(JSON.stringify({ error: 'Message is required' })),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Use provided model or default to DeepSeek-R1-0528
    const selectedModel = model || 'DeepSeek-R1-0528';
    console.log('🤖 [Chat API] Using SambaNova model:', selectedModel);

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

    // Check if Gmail is enabled
    const { data: gmailIntegration } = await supabase
      .from('organization_integrations')
      .select('is_enabled')
      .eq('organization_id', user.organization_id)
      .eq('integration_type', 'gmail_user')
      .eq('is_enabled', true)
      .maybeSingle();

    const hasGmail = !!gmailIntegration;
    
    console.log('📬 Gmail integration check:', {
      organizationId: user.organization_id,
      hasGmail,
      integration: gmailIntegration
    });

    // Combine available tools
    const availableTools = [
      ...(hasSalesforce ? salesforceTools : []),
      ...(hasOutlook ? outlookTools : []),
      ...(hasGmail ? gmailTools : [])
    ];

    console.log('🤖 Chat API - Available tools:', {
      hasSalesforce,
      hasOutlook,
      hasGmail,
      toolsCount: availableTools.length,
      toolNames: availableTools.map(t => t.function?.name)
    });

    // Get sales materials for context
    let salesMaterials = '';
    const { data: materials } = await supabase
      .from('sales_materials')
      .select('file_name, extracted_text, category')
      .eq('user_id', user.id)
      .limit(5);

    if (materials && materials.length > 0) {
      salesMaterials = '\n\n**YOUR COMPANY MATERIALS & KNOWLEDGE BASE:**\n' + materials.map(m => {
        const extractedText = m.extracted_text || 'No text extracted';
        // Increase limit to 5000 chars per document for better context
        const text = extractedText.length > 5000 ? extractedText.substring(0, 5000) + '...' : extractedText;
        return `\n📄 **${m.file_name}** [${m.category}]:\n${text}`;
      }).join('\n\n');
      
      console.log('📚 Added sales materials to context:', materials.length, 'files');
    }

    // Get current date and time FIRST (needed for calendar context)
    const now = new Date();
    const currentDateTime = now.toLocaleString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York'
    });
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: true });

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
      calendarContext = `\n\n📅 **YOUR CALENDAR EVENTS (Today: ${currentDate}):**\n${calendarEvents.map((event: any) => {
        const eventDate = new Date(event.start);
        const eventDateStr = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const eventTimeStr = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `- ${event.title} on ${eventDateStr} at ${eventTimeStr}${event.description ? ' (' + event.description + ')' : ''}`;
      }).join('\n')}

When asked about events, reference these directly. Only search if user asks to find specific events.`;
    }

    // Get recent emails if Outlook is connected
    let emailContext = '';
    if (hasOutlook) {
      try {
        const recentEmails = await getRecentEmails(user.organization_id, user.id, 10);
        if (recentEmails.length > 0) {
          emailContext = '\n\n**RECENT EMAIL EXCHANGES (Last 10):**\n';
          recentEmails.forEach((email: any, index: number) => {
            const from = email.from?.emailAddress?.name || email.from?.emailAddress?.address || 'Unknown';
            const fromEmail = email.from?.emailAddress?.address || '';
            const subject = email.subject || '(No subject)';
            const date = new Date(email.receivedDateTime).toLocaleDateString();
            const preview = email.bodyPreview?.substring(0, 100) || '';
            
            emailContext += `\n${index + 1}. From: ${from} <${fromEmail}>\n`;
            emailContext += `   Subject: ${subject}\n`;
            emailContext += `   Date: ${date}\n`;
            emailContext += `   Preview: ${preview}...\n`;
          });
          console.log('📧 Added recent emails to context:', recentEmails.length);
        }
      } catch (error) {
        console.error('Error fetching recent emails for context:', error);
        // Don't fail the whole request if email fetch fails
      }
    }

    // Build system prompt with context - ONLY mention connected integrations
    let systemPrompt = `You are Curiosity Engine, an AI sales assistant for ${user.full_name || 'the user'}.

🕐 CURRENT DATE & TIME (Eastern Time):
${currentDateTime}
ISO Date: ${currentDate}

IMPORTANT: When user asks about "today", use ${currentDate}. Don't overthink timezones - events are shown in their local timezone.
If you see calendar events in the context below, answer directly. Only use search tools if the user asks to search for something specific.`;

    if (hasSalesforce) {
      systemPrompt += `
✅ Salesforce CRM is connected. You have these powerful capabilities:

**SEARCH & FIND:**
- search_salesforce: Find contacts/leads by name, email, or company
- query_crm: Execute custom SOQL queries for complex searches
- Examples: "Find John Smith", "Who do I know at Acme Corp?"

**CREATE RECORDS:**
- create_lead: Add new prospects (requires: first name, last name, company)
- create_contact: Add established relationships (requires: first name, last name)
- Examples: "Add this person as a lead", "Create a contact for Jane Doe"

**UPDATE INFORMATION:**
- update_record: Modify existing contact/lead fields (email, phone, title, status, etc.)
- Examples: "Update John's email", "Change lead status to qualified"

**LOG ACTIVITY:**
- add_note: Add notes about interactions, meetings, conversations
- create_task: Set follow-up tasks with due dates and priority
- get_activity: View recent tasks, events, notes for a person
- Examples: "Add a note about our call", "Remind me to follow up Friday"

**USE THESE PROACTIVELY** to help users manage their pipeline and relationships!`;
    }

    if (hasOutlook) {
      systemPrompt += `
✅ Outlook is connected. You have these powerful capabilities:

**EMAIL FUNCTIONS:**
- create_email_draft: Create draft emails (ALWAYS use this tool when user asks for drafts)
- send_email: Send emails immediately
- search_emails: Search email history for conversations, people, or topics
- View recent emails: Last 10 emails are in context below (check for "latest prospect" queries)
- Examples: "Draft email to latest prospect", "Find emails about [topic]"

**CALENDAR FUNCTIONS:**
- create_calendar_event: Schedule meetings with attendees, location, agenda
- View calendar: Upcoming events are in context below (reference them directly)
- Examples: "Schedule a call with John next Tuesday", "What meetings do I have?"

**USE RECENT EMAILS to identify "latest prospect"** - the most recent email sender/recipient is likely who they mean!`;
    }

    if (!hasSalesforce && !hasOutlook) {
      systemPrompt += `
⚠️ No integrations connected. You can only provide general sales advice and insights.`;
    }

    systemPrompt += `

## DATA PRIORITIZATION (CRITICAL):
When the user mentions vague references like "latest prospect", "that person", "my call", etc:

**Step 1 - Check ALL Data Sources FIRST (in this order):**
1. Recent email exchanges (check FROM field and receivedDateTime) - **PRIORITIZE for "latest prospect"**
2. Calendar events (check for recent/upcoming meetings)
3. Salesforce CRM (check for recent contact/lead activity)

**Step 2 - Use Most Recent Interaction:**
- Compare timestamps across all sources
- Use the MOST RECENT interaction to identify the person
- Example: If most recent email is from "John Smith <john@acme.com>" 2 hours ago, that's the latest prospect

**Step 3 - Only Ask for Clarification If:**
- No recent activity found in ANY data source
- Multiple recent people with equal recency (e.g., 3 emails in last hour from different people)
- User request is truly ambiguous even with data

**Common Patterns to Handle Intuitively:**
- "latest prospect" = Check recent emails FIRST (most recent sender/recipient)
- "that person I met" = Check calendar for recent meetings
- "my call yesterday" = Check calendar for yesterday's events  
- "the lead from [Company]" = Search Salesforce by company name
- "draft email to latest" = Use most recent email exchange to determine recipient

**ALWAYS check data sources before making assumptions or asking questions!**

## Response Formatting Guidelines:
- Use **bold** for emphasis and important points
- Structure responses with clear headings (### for main sections, #### for subsections)
- Use bullet points (•) for lists to improve readability
- Add relevant emojis to make content engaging (e.g., 💡 for ideas, 🎯 for goals, 📧 for emails, 📅 for calendar)
- Add spacing between sections for better readability
- Keep paragraphs concise and scannable
- Use numbered lists for sequential steps
- Be concise, professional, and action-oriented
- When creating email drafts, ALWAYS use the create_email_draft tool to save them to Outlook.`;

    // Add user profile context
    systemPrompt += `\n\nYOUR PROFILE & COMPANY:
- Name: ${user.full_name || 'Not set'}
- Role: ${user.job_title || 'Not set'}
- Company: ${user.company_name || 'Not set'}
- Website: ${user.company_url || 'Not set'}`;

    if (userContext) {
      systemPrompt += `\n\nYOUR PERSONAL CONTEXT:\n${JSON.stringify(userContext, null, 2)}`;
    }

    if (salesMaterials) {
      systemPrompt += `\n\nYOUR COMPANY MATERIALS & OFFERINGS:${salesMaterials}`;
    }

    if (emailContext) {
      systemPrompt += emailContext;
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

    // Determine which model to use (respects user selection or uses auto-routing)
    const actualModel = selectModel(message, model);
    console.log('🤖 [Chat API] Model selection:', {
      userSelected: model,
      actualModel,
      isAuto: model === 'auto',
      message: message.substring(0, 100) + '...',
      toolsAvailable: hasSalesforce || hasGmail || hasOutlook
    });

    // Create LangChain tools from available integrations
    const langchainTools = createAgentTools(user.organization_id, user.id, {
      hasSalesforce,
      hasGmail,
      hasOutlook,
    });

    console.log('🔧 [Chat API] Created', langchainTools.length, 'LangChain tools');

    // Build LangChain messages from conversation history
    const langchainMessages = [
      new SystemMessage(systemPrompt),
      ...conversationHistory.map((msg: any) => 
        msg.role === 'user' ? new HumanMessage(msg.content) : new SystemMessage(msg.content)
      ),
      new HumanMessage(message),
    ];

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send context info to frontend for thinking display
          const contextSummary = [];
          if (salesMaterials) contextSummary.push('Sales Materials');
          if (emailContext) contextSummary.push('Recent Emails');
          if (calendarContext) contextSummary.push('Calendar Events');
          if (hasSalesforce) contextSummary.push('Salesforce CRM');
          
          if (contextSummary.length > 0) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'context_loaded',
                sources: contextSummary
              })}\n\n`)
            );
          }

          // Invoke LangGraph agent with streaming
          console.log('🚀 [Chat API] Invoking LangGraph agent with model:', actualModel);
          
          await invokeAgent(
            langchainMessages,
            langchainTools,
            actualModel, // Pass the resolved model name (not "auto")
            model, // Pass original user selection for fallback logic
            (event) => {
              // Stream events to frontend in SSE format
              try {
                if (event.type === 'content') {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({
                      type: 'content',
                      content: event.content,
                      model: event.model
                    })}\n\n`)
                  );
                } else if (event.type === 'tool_start') {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({
                      type: 'tool_start',
                      tool: event.tool
                    })}\n\n`)
                  );
                } else if (event.type === 'tool_result') {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({
                      type: 'tool_result',
                      result: event.result
                    })}\n\n`)
                  );
                } else if (event.type === 'done') {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
                  );
                } else if (event.type === 'error') {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({
                      type: 'error',
                      error: event.content
                    })}\n\n`)
                  );
                }
              } catch (streamError) {
                console.error('Error encoding stream event:', streamError);
              }
            }
          );

          controller.close();
        } catch (error) {
          console.error('❌ [Chat API] Agent invocation error:', error);
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
    console.error('❌ [Chat API] Fatal error:', error);
    console.error('❌ [Chat API] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return new Response(
      encoder.encode(JSON.stringify({
        error: 'Failed to process chat message',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
