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
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { createAgentTools } from '@/lib/langgraph-tools';
import { SimpleFunctionCalling } from '@/lib/simple-function-calling';
import { selectModel, isToolBasedRequest } from '@/lib/model-router';

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
          subject: args.subject,
          start: args.start,
          end: args.end,
          body: args.body,
          attendees: args.attendees,
          location: args.location
        }, userId);
        return `✅ Calendar event created successfully in Outlook!
Title: ${args.subject}
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
          summary: args.summary,
          start: args.start,
          end: args.end,
          description: args.description,
          attendees: args.attendees,
          location: args.location
        }, userId);
        return `✅ Calendar event created successfully in Google Calendar!
Title: ${args.summary}
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
    console.log('🤖 [Chat API] Request parsed:', {
      hasMessage: !!message,
      eventsCount: calendarEvents.length,
      events: calendarEvents.map((e: any) => ({ title: e.title, start: e.start }))
    });

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

    // Check if Monday.com is enabled
    console.log('🟣 [Chat API] Checking Monday.com for org:', user.organization_id);
    const { data: mondayIntegration, error: mondayError } = await supabase
      .from('organization_integrations')
      .select('*')
      .eq('organization_id', user.organization_id)
      .in('integration_type', ['monday', 'monday_user'])
      .eq('is_enabled', true)
      .maybeSingle();

    console.log('🟣 [Chat API] Monday.com query result:', {
      found: !!mondayIntegration,
      error: mondayError,
      type: mondayIntegration?.integration_type,
      enabled: mondayIntegration?.is_enabled,
      hasConfig: !!mondayIntegration?.configuration
    });

    const hasMonday = !!mondayIntegration;
    console.log('🟣 [Chat API] hasMonday final value:', hasMonday);

    console.log('🔍 Salesforce integration check:', {
      organizationId: user.organization_id,
      hasSalesforce,
      integration: salesforceIntegration
    });

    console.log('🟣 Monday.com integration check:', {
      organizationId: user.organization_id,
      hasMonday,
      integration: mondayIntegration
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
      hasMonday,
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
      calendarContext = `

================================
📅 YOUR UPCOMING CALENDAR EVENTS
================================
Current Date: ${currentDate}
Total Events: ${calendarEvents.length}

${calendarEvents.map((event: any, index: number) => {
        const eventDate = new Date(event.start);
        const eventDateStr = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const eventTimeStr = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' });
        const attendeesStr = event.attendees && event.attendees.length > 0 ? `\n   Attendees: ${event.attendees.join(', ')}` : '';
        const locationStr = event.location ? `\n   Location: ${event.location}` : '';
        const descStr = event.description ? `\n   Details: ${event.description}` : '';
        return `${index + 1}. ${event.title}
   Date: ${eventDateStr}
   Time: ${eventTimeStr}${attendeesStr}${locationStr}${descStr}`;
      }).join('\n\n')}

================================

🚨 CRITICAL FORMATTING - READ THE FORMATTED TIMES ABOVE:
- The events above are ALREADY formatted with human-readable dates and times
- Copy the formatted times from above (e.g., "Nov 10, 2025 at 3:00 PM")
- NEVER output raw ISO strings like "2025-11-10T15:00:00-05:00" to the user
- NEVER copy event.start directly - use the formatted "Date" and "Time" fields shown above
- Example correct response: "You have 2 meetings tomorrow: Meeting with Paul at 9:00 AM and Curiosity Test Event at 2:00 PM"
- Example WRONG response: "Meeting with Paul at 2025-11-10T15:00:00-05:00" ← NEVER DO THIS`;

      console.log('📅 Calendar context created with', calendarEvents.length, 'events');
      console.log('📅 Calendar context preview:', calendarContext.substring(0, 500));
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

🕐 CURRENT DATE & TIME (Eastern Time - EST/EDT):
${currentDateTime}
ISO Date: ${currentDate}
Timezone: America/New_York (UTC-05:00 EST or UTC-04:00 EDT)

🚨 CRITICAL RESPONSE FORMATTING RULES:

1. **NEVER show raw JSON, tool calls, or function parameters to the user in your final response.**
2. **NEVER output strings like {"type": "function", "name": ...} - this is internal data only.**
3. **IF YOU NEED TO REASON OR "THINK" BEFORE ANSWERING:**
   - Use ONLY the <think>...</think> tags for your internal reasoning process.
   - Anything inside <think> tags will be shown in a collapsible "Thinking" section.
   - Anything OUTSIDE <think> tags is your final response to the user.
   - Your final response MUST be clean, natural language - NO thinking content should leak outside the tags.
4. **When using tools:**
   - Let them execute in the background
   - Provide a clean, human-friendly summary of the results
   - NEVER show the raw tool output or JSON
5. **Format all times in 12-hour format (3:00 PM, not 15:00 or T15:00:00-05:00).**
6. **Be conversational and natural - respond like a helpful human assistant would.**

EXAMPLE CORRECT FORMAT:
<think>
The user is asking for the CEO of Anthropic. I need to search for this information.
I'll use the web_search tool to find the current CEO.
</think>

I found that Dario Amodei is the current CEO and co-founder of Anthropic.

EXAMPLE WRONG FORMAT (NEVER DO THIS):
<think>Searching for CEO...</think>
I'll search for the CEO now.
<think>Found the information</think>

The CEO is Dario Amodei.

CRITICAL TIMEZONE INSTRUCTIONS (for tool calls only, not for display):
- When creating calendar events, ALWAYS include timezone offset in ISO 8601 format
- For EST/EDT times, use format: 2024-01-15T15:00:00-05:00 (EST) or 2024-01-15T15:00:00-04:00 (EDT)
- If user says "3pm EST", create tool input: ${currentDate}T15:00:00-05:00
- If user says "2pm tomorrow", create tool input: {tomorrow}T14:00:00-05:00
- If user mentions PST (-08:00), CST (-06:00), MST (-07:00), use those offsets
- But when DISPLAYING times to user, format as "3:00 PM" or "2:00 PM tomorrow"

IMPORTANT: When user asks about "today", use ${currentDate}. Don't overthink timezones - events are shown in their local timezone.
If you see calendar events in the context below, answer directly. Only use search tools if the user asks to search for something specific.

📚 ABOUT CURIOSITY ENGINE:

**What is Curiosity Engine?**
Curiosity Engine is an AI-powered sales assistant that helps sales professionals by connecting to their CRM, email, and calendar systems. You can search for contacts, draft emails, schedule meetings, research prospects, and more - all through natural conversation.

**Available Integrations:**
- **Salesforce CRM** - Search contacts/leads, create records, add notes, manage tasks
- **Monday.com CRM** - Search contacts, create new contacts in boards
- **Gmail** - Draft emails, send emails, search inbox, create calendar events
- **Outlook** - Draft emails, send emails, search inbox, create calendar events
- **Web Search** - Real-time web search for current information, company research, news

**How to Connect Integrations:**
1. Click the "Connectors" tab in the dashboard
2. Find the integration you want to connect (Salesforce, Gmail, Outlook, Monday.com)
3. Click "Connect" and authorize access
4. Once connected, you can use natural language to interact with that system

**Common Use Cases:**
- "Search for John Smith in Salesforce" - Find contacts/leads
- "Draft an email to jane@example.com about our meeting" - Create email drafts
- "Schedule a meeting with Bob next Tuesday at 2pm" - Create calendar events
- "What's the latest news about AI hyperscalers?" - Web research
- "Create a new lead for Acme Corp" - Add prospects to CRM
- "Show me my calendar for today" - View upcoming events
- "Search my emails from last week" - Find specific messages

**Troubleshooting:**
- If a connector shows "Not Connected", go to Connectors tab and click Connect
- If you get permission errors, try reconnecting the integration
- For Salesforce, you may need both organization-level AND user-level connections
- Calendar events are shown in your local timezone (${currentDateTime.split(',')[0]})

**Your Capabilities:**
When integrations are connected, you can:
✅ Search and query CRM data
✅ Create and update CRM records
✅ Draft and send emails
✅ Schedule calendar events
✅ Search email history
✅ Research companies and prospects online
✅ Provide real-time information via web search

`;

    if (hasSalesforce) {
      systemPrompt += `
✅ Salesforce CRM is connected. YOU CAN and MUST use these tools when asked about Salesforce data:

**CRITICAL - WHEN USER ASKS ABOUT SALESFORCE:**
- "Review my leads" → USE query_crm tool with SOQL: SELECT Id, Name, Email, Company FROM Lead ORDER BY CreatedDate DESC LIMIT 10
- "Check my contacts" → USE query_crm tool with SOQL: SELECT Id, Name, Email FROM Contact ORDER BY CreatedDate DESC LIMIT 10
- "Show recent leads" → USE query_crm tool to fetch recent leads ✅
- DO NOT say "functions are insufficient" or "exceeds limitations" - YOU HAVE THE TOOLS! ✅

**AVAILABLE TOOLS:**
- search_salesforce: Find specific person by name/email (best for searching by name)
- query_crm: Run SOQL queries to get leads, contacts, opportunities
- create_lead: Add new prospects
- create_contact: Add new contacts
- update_record: Update existing records
- add_note: Add notes to records
- create_task: Create follow-up tasks
- get_activity: View recent activity

**🚨 CRITICAL SOQL RULES - MUST FOLLOW:**
1. NEVER use WHERE clauses with text/string values (causes JSON parse errors)
2. NEVER use quotes in SOQL queries (like Status = 'Open' or StageName = 'Closed Won')
3. ONLY use simple queries: SELECT fields FROM object ORDER BY field LIMIT number
4. For filtered searches (by status, stage, etc.) → USE search_salesforce tool instead, NOT query_crm

**CORRECT EXAMPLES:**
✅ query_crm: SELECT Id, Name, Email, Company FROM Lead ORDER BY CreatedDate DESC LIMIT 10
✅ query_crm: SELECT Id, Name, Email FROM Contact ORDER BY Name LIMIT 20
✅ query_crm: SELECT Id, Name, Amount FROM Opportunity ORDER BY CreatedDate DESC LIMIT 10

**WRONG - DO NOT USE:**
❌ query_crm with WHERE Status = 'value' (breaks JSON parser)
❌ query_crm with WHERE StageName = 'value' (breaks JSON parser)
❌ Any SOQL with single or double quotes in values

**For filtered searches:** Use search_salesforce instead of query_crm with WHERE clauses.

**YOU MUST USE THESE TOOLS - They are available and working!**`;
    }

    if (hasMonday) {
      systemPrompt += `

✅ Monday.com CRM is connected to YOUR workspace. YOU HAVE direct access via tools.

**🚨 CRITICAL - WHEN USER SAYS "MONDAY CRM" OR "MY MONDAY":**
- This refers to THEIR Monday.com CRM integration (NOT the monday.com website!)
- DO NOT use web_search or browse_url to look up Monday.com - that's the public website!
- USE the search_monday tool to access THEIR Monday.com CRM data!
- "my monday crm" = Their integrated Monday.com workspace (use search_monday)
- "monday.com website" = Public website (only then use web search)

**AVAILABLE CRM TOOLS:**
- search_monday: Search YOUR Monday.com CRM boards by name or email
- create_monday_contact: Add new contacts to YOUR Monday.com CRM

**CORRECT USAGE:**
- "Can you see my Monday CRM leads?" → Use search_monday tool (ask for specific name) ✅
- "Check my Monday.com" → Use search_monday tool ✅
- "Find John in my Monday workspace" → Use search_monday with name: "John" ✅
- "Access my Monday CRM" → Use search_monday tool ✅

**WRONG USAGE:**
- DO NOT use browse_url for "my monday crm" ❌
- DO NOT use web_search for "check my monday" ❌
- DO NOT say "I cannot access" - you CAN access via search_monday! ❌

**IMPORTANT:**
- Monday.com CRM tools are for YOUR integrated workspace, not the public website
- When user says "my monday" they mean their CRM integration
- ALWAYS use search_monday tool, never browse the website
- Monday.com doesn't have "view all" - ask user for specific person to search

YOU HAVE DIRECT ACCESS TO MONDAY.COM VIA TOOLS - USE THEM!`;
    }

    if (hasGmail) {
      systemPrompt += `
✅ Gmail & Google Calendar are connected. You have these powerful capabilities:

**📅 VIEWING CALENDAR EVENTS:**
${calendarEvents.length > 0 ? `
✅ User's upcoming calendar events are in your context above.
- When asked about meetings/calendar → Simply list the events from context (no tools, no explanations about setup)
- Be concise: Just state the meeting name, date, and time
- Example response: "You have 2 meetings tomorrow: Meeting with Paul at 9:00 AM and Meeting with Tim at 11:30 AM"
` : `No upcoming events loaded.`}

**EMAIL FUNCTIONS:**
- create_gmail_draft: Create draft emails in Gmail
- send_gmail_email: Send emails immediately via Gmail  
- search_gmail_emails: Search Gmail for emails, conversations, people
- Examples: "Draft email to john@example.com", "Search emails from Sarah"

**CALENDAR TOOLS (for CREATING events only):**
- create_google_calendar_event: ONLY use to CREATE NEW meetings (NOT to view existing ones)
- search_calendar_events: Search for old/specific events if needed
- Examples: "Schedule call next Tuesday at 2pm" → Use create tool ✅

**CRITICAL - EMAIL DRAFTING REQUIREMENTS:**
When user asks to draft an email, you MUST:
1. **Generate COMPLETE email content** - NEVER leave body parameter empty!
2. **Include ONLY these email parts:**
   - Professional greeting: "Hi [Name]," or "Hello [Name],"
   - Message body: 2-4 concise paragraphs explaining purpose
   - **DO NOT include closing signature** (e.g., "Best regards, [Name]") - the system will automatically append the user's Gmail/Outlook signature
3. **Use context intelligently:**
   - Reference company materials and offerings
   - Mention user's role: ${user.job_title || 'their position'}
   - Include company name: ${user.company_name || 'their company'}
4. **Be specific and actionable:**
   - Clear purpose for email
   - Specific value proposition
   - Concrete next step or call-to-action
5. **Keep it professional but personable** - aim for 150-200 words (body only, excluding auto-signature)
6. **Automatically resolve recipient emails** - if the user only gives a name (e.g., "follow up with Jana"), use recent email context or the 'search_gmail_emails' tool to find the correct address. Only ask for clarification when no relevant match exists.
7. **NEVER include system or transport metadata** - do NOT echo Date, Message-Id, model identifiers, tool thoughts, or any internal reasoning text. Only the polished email should appear.
8. **Ensure clean formatting** - use clear paragraph breaks (blank line between thoughts) and avoid stray whitespace or duplicated sentences.

**EXAMPLE - Good email draft body (NO closing signature):**
"Hi John,

I hope this email finds you well. I'm ${user.full_name || 'reaching out'} from ${user.company_name || 'my company'}, and I wanted to connect about [specific reason].

[Value proposition paragraph using company materials]

Would you be open to a brief 15-minute call next week to discuss how we might be able to help?"

**REMEMBER:**
- End the email body with the call-to-action or closing question
- DO NOT add "Best regards," "Thanks," or any signature line
- The system will automatically append the user's Gmail/Outlook signature with name, title, contact info

**NEVER submit empty body parameter - always write full email content!**`;
    }

    if (hasOutlook) {
      systemPrompt += `
✅ Outlook is connected. You have these powerful capabilities:

**📅 VIEWING CALENDAR EVENTS:**
${calendarEvents.length > 0 ? `
✅ User's upcoming calendar events are in your context above.
- When asked about meetings/calendar → Simply list the events from context (no tools, no explanations about setup)
- Be concise: Just state the meeting name, date, and time
- Example response: "You have 2 meetings tomorrow: Meeting with Paul at 9:00 AM and Meeting with Tim at 11:30 AM"
` : `No upcoming events loaded.`}

**EMAIL FUNCTIONS:**
- create_email_draft: Create draft emails (ALWAYS use this tool when user asks for drafts)
- send_email: Send emails immediately
- search_emails: Search email history for conversations, people, or topics
- View recent emails: Last 10 emails are in context below (check for "latest prospect" queries)

**CALENDAR TOOLS (for CREATING events only):**
- create_calendar_event: ONLY use to CREATE/SCHEDULE NEW meetings (NOT to view existing ones)

**EXAMPLES:**
- "What meetings tomorrow?" → Read from YOUR UPCOMING CALENDAR EVENTS context above ✅
- "Schedule meeting at 2pm" → Use create_calendar_event tool ✅
- "Draft email to Sarah" → Use create_email_draft tool ✅

**USE RECENT EMAILS to identify "latest prospect"** - the most recent email sender/recipient is likely who they mean!`;
    }

    // Web browsing is always available
    systemPrompt += `

🌐 **WEB SEARCH & RESEARCH** (Powered by Tavily API)
You have access to production-grade, real-time web search capabilities:

**RESEARCH TOOLS:**
- web_search: Search the web using Tavily API (LLM-optimized results with relevance scores)
- browse_url: Navigate to and extract content from specific URLs/websites

**WHEN TO USE:**
- User asks for current/real-time information ("latest news", "current trends", "recent updates")
- Need to verify company information, websites, recent announcements, or contact details
- Research competitors, market data, industry insights, or emerging technologies
- Find documentation, guides, best practices, or technical specifications
- Any information not in your training data (pre-April 2024)

**EXAMPLES:**
- "Search for latest AI trends in sales 2024" → use web_search
- "What's new with SambaNova Systems this week?" → use web_search
- "Browse https://acme.com/about" → use browse_url with specific URL
- "Find recent funding news about Company X" → use web_search
- "Research best CRM practices for enterprise" → use web_search

**PROACTIVE USE:** When a user mentions a company or technology, proactively search for recent news, updates, or official sources to provide current, accurate context!

**CITATION REQUIREMENTS:**
When using web search or browse_url tools, you MUST:
1. **Cite all sources** using numbered references like [1], [2], [3] after statements
2. **Format citations** at the end of your response in a "**Sources:**" section
3. **Use markdown links** - Format sources as clickable links: [1] [Title](URL)
4. **Be specific** - Quote or reference specific facts from the sources
5. **Show relevance** - Prioritize sources with higher relevance scores

**Citation Format Example:**
"According to recent research [1], AI adoption in sales has increased 300% this year. The top CRM platforms [2] now integrate AI natively, while emerging startups [3] are focusing on vertical-specific solutions..."

**Sources:**

[1] [AI Sales Trends 2024 - TechCrunch](https://example.com/ai-trends)

[2] [Enterprise CRM Analysis - Gartner](https://example.com/crm-analysis)

[3] [Vertical SaaS Report - CB Insights](https://example.com/vertical-saas)

**CRITICAL:** Each source MUST be on its own line with a blank line after it for proper formatting!

**Remember:** Always cite sources with clickable markdown links when presenting facts, statistics, or information from web searches!`;


    if (!hasSalesforce && !hasOutlook) {
      systemPrompt += `
⚠️ No CRM/Email integrations connected. You can still provide sales advice and use web research!`;
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

## CRITICAL - UNDERSTAND USER INTENT (Tool Selection):

**READ Operations (User wants to VIEW/CHECK/SEE existing data):**
- "check my calendar" → Use search_calendar_events (DO NOT create events!)
- "what's on my schedule" → Use search_calendar_events
- "show me my calendar" → Use search_calendar_events
- "what meetings do I have" → Use search_calendar_events
- "find emails from X" → Use search_gmail_emails or search_emails
- "show me emails about Y" → Use search_gmail_emails or search_emails
- "what did X say" → Use search_emails

**WRITE Operations (User explicitly asks to CREATE/SEND/SCHEDULE):**
- "create a calendar event" → Use create_calendar_event
- "schedule a meeting" → Use create_calendar_event
- "set up a call" → Use create_calendar_event
- "draft an email" → Use create_email_draft or create_gmail_draft
- "send email to X" → Use send_email or send_gmail_email

**IMPORTANT:**
- DO NOT create sample/placeholder/test events unless user explicitly asks to "create" or "schedule"
- If user says "check" or "show" → They want to READ, not WRITE
- When unsure → Ask the user to clarify their intent
- Calendar context is already provided above - reference it directly for "what's on my calendar" queries

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

    // Check if LangGraph is enabled (can be disabled via env var for debugging)
    // LangGraph is now ALWAYS used for tool-based requests to avoid JSON parsing errors
    console.log('🔀 [Chat API] LangGraph will be used automatically for tool requests');

    // Detect if this specific message needs tools (not just if tools exist)
    const messageNeedsTools = isToolBasedRequest(message);
    console.log('🔍 [Chat API] Message needs tools:', messageNeedsTools);

    // Create LangChain tools from available integrations
    const langchainTools = createAgentTools(user.organization_id, user.id, {
      hasSalesforce,
      hasMonday,
      hasGmail,
      hasOutlook,
    });

    console.log('🔧 [Chat API] Created', langchainTools.length, 'LangChain tools');

    // Build LangChain messages from conversation history
    const langchainMessages = [
      new SystemMessage(systemPrompt),
      ...conversationHistory.map((msg: any) => {
        if (msg.role === 'user') {
          return new HumanMessage(msg.content);
        } else if (msg.role === 'assistant') {
          return new AIMessage(msg.content);
        } else {
          return new SystemMessage(msg.content);
        }
      }),
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
          if (hasMonday) contextSummary.push('Monday.com CRM');

          if (contextSummary.length > 0) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'context_loaded',
                sources: contextSummary
              })}\n\n`)
            );
          }

          //  Check if we should use LangGraph or direct API
          // FORCE LangGraph for tool-based requests to avoid SambaNova JSON parsing errors
          // Only use direct API for simple non-tool conversations
          const shouldUseLangGraph = langchainTools.length > 0 && messageNeedsTools;

          let contentSent = false; // Track if any content was sent

          if (!shouldUseLangGraph) {
            // No tools needed - use direct API call for simple conversation
            console.log('📞 [Chat API] Using direct API (no tools needed), reason:',
              !messageNeedsTools ? 'message is conversational' :
                'no tools available'
            );

            const completion = await openai.chat.completions.create({
              model: actualModel,
              messages,
              stream: true,
              max_tokens: 2000,
            });

            for await (const chunk of completion) {
              const delta = chunk.choices[0]?.delta;
              if (delta?.content) {
                contentSent = true;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    type: 'content',
                    content: delta.content
                  })}\n\n`)
                );
              }
              if (chunk.choices[0]?.finish_reason === 'stop') {
                // Safety check - if no content was sent, send error message
                if (!contentSent) {
                  console.error('⚠️ [Chat API] No content generated by direct API');
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({
                      type: 'content',
                      content: 'I apologize, but I was unable to generate a response. Please try again.'
                    })}\n\n`)
                  );
                }
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
              }
            }
          } else {
            // Use SimpleFunctionCalling for tool-based interactions
            console.log('🚀 [Chat API] Using SimpleFunctionCalling with model:', actualModel);
            console.log('🚀 [Chat API] Tools available:', langchainTools.map(t => t.name));

            try {
              // Create SimpleFunctionCalling instance
              const functionCalling = new SimpleFunctionCalling({
                model: actualModel,
                apiKey: process.env.SAMBANOVA_API_KEY!,
                tools: langchainTools,
                maxIterations: 10,
                temperature: 0.1,
              });

              // Use streaming version
              const stream = functionCalling.stream(
                message,
                systemPrompt,
                // onToolCall
                (toolName, args) => {
                  console.log(`🔧 [Chat API] Tool called: ${toolName}`, args);
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({
                      type: 'tool_start',
                      tool: toolName
                    })}\n\n`)
                  );
                },
                // onToolResult
                (toolName, result) => {
                  console.log(`✅ [Chat API] Tool result: ${toolName}`);
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({
                      type: 'tool_result',
                      result: result.substring(0, 200) // Truncate for display
                    })}\n\n`)
                  );
                }
              );

              // Process stream events
              for await (const event of stream) {
                console.log('📡 [Chat API] Stream event:', event.type);

                if (event.type === 'content') {
                  contentSent = true;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({
                      type: 'content',
                      content: event.content,
                      model: actualModel
                    })}\n\n`)
                  );
                } else if (event.type === 'error') {
                  console.error('❌ [Chat API] Stream error:', event.content);
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({
                      type: 'error',
                      error: event.content
                    })}\n\n`)
                  );
                }
              }

              console.log('✅ [Chat API] Function calling completed, content sent:', contentSent);

              // Send done event
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
              );

              // Safety check - if no content was sent, send fallback message
              if (!contentSent) {
                console.warn('⚠️ [Chat API] No content generated - sending fallback');
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    type: 'content',
                    content: 'I apologize, but I was unable to generate a response. Please try again.'
                  })}\n\n`)
                );
              }
            } catch (agentError) {
              console.error('❌ [Chat API] Agent invocation failed:', agentError);
              console.error('❌ [Chat API] Error details:', agentError);

              // Send error as content so user sees something
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: 'content',
                  content: `Sorry, I encountered an error: ${agentError instanceof Error ? agentError.message : 'Unknown error'}. Please try again.`
                })}\n\n`)
              );
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
              );
            }
          }

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
