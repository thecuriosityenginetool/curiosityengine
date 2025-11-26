/**
 * LangChain Tool Wrappers for Curiosity Engine
 * 
 * Wraps existing tool functions into LangChain Tool format for use with LangGraph agents.
 * These tools enable the AI to interact with Salesforce, Gmail, Outlook, and Calendar.
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Import existing tool executors
import {
  searchPersonInSalesforce,
  createSalesforceLead,
  createSalesforceContact,
  updateSalesforceContact,
  updateSalesforceLead,
  addSalesforceNote,
  createSalesforceTask,
  querySalesforce,
} from './salesforce';

import {
  searchPersonInMonday,
  createMondayContact,
} from './monday';

import {
  createGmailDraft,
  sendGmailEmail,
  createGoogleCalendarEvent,
  searchGmailEmails,
} from './gmail';

import {
  createEmailDraft,
  sendEmail,
  createCalendarEvent,
  searchEmails,
} from './outlook';

import {
  searchWeb,
  browseUrl,
  formatSearchResultsForAI,
  formatBrowsedContentForAI,
} from './web-search';

// Supabase client for activity logging
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function sanitizeEmailBody(body: string): string {
  if (!body) {
    return '';
  }

  let sanitized = body.replace(/\r/g, '').replace(/\u00a0/g, ' ');

  const metadataPatterns = [
    /(^|\n)date\s*:\s?[^\n]*(?=\n|$)/gi,
    /(^|\n)message-?id\s*:\s?[^\n]*(?=\n|$)/gi,
    /(^|\n)from\s*:\s?[^\n]*(?=\n|$)/gi,
    /(^|\n)model\s*:\s?[^\n]*(?=\n|$)/gi,
    /(^|\n)(?:parsed event type|chunk|stream|auth bridge)[^\n]*(?=\n|$)/gi,
  ];

  metadataPatterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, '');
  });

  const unicodeMap: Record<string, string> = {
    '\u2018': "'",
    '\u2019': "'",
    '\u201C': '"',
    '\u201D': '"',
    '\u2013': '-',
    '\u2014': '-',
    'â€™': "'",
    'â€œ': '"',
    'â€\u009d': '"',
    'â€“': '-',
    'â€”': '-',
  };

  Object.entries(unicodeMap).forEach(([key, value]) => {
    sanitized = sanitized.split(key).join(value);
  });

  sanitized = sanitized
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n');

  sanitized = sanitized.replace(/\n{3,}/g, '\n\n').trim();

  return sanitized;
}

/**
 * Log activity to activity_logs table
 */
async function logActivity(
  organizationId: string,
  userId: string,
  actionType: string,
  resourceType: string,
  details: any
): Promise<void> {
  try {
    await supabase.from('activity_logs').insert({
      organization_id: organizationId,
      user_id: userId,
      action_type: actionType,
      resource_type: resourceType,
      details,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Failed to log activity:', error);
    // Don't throw - activity logging failure shouldn't break tool execution
  }
}

/**
 * Create LangChain tools based on available integrations
 */
export function createAgentTools(
  organizationId: string,
  userId: string,
  options: {
    hasSalesforce?: boolean;
    hasMonday?: boolean;
    hasGmail?: boolean;
    hasOutlook?: boolean;
  }
) {
  const tools: DynamicStructuredTool[] = [];

  // Salesforce Tools
  if (options.hasSalesforce) {
    tools.push(
      new DynamicStructuredTool({
        name: 'search_salesforce',
        description: 'Search for contacts or leads in Salesforce CRM by name, email, or company. Use this when user asks about finding people or checking if someone exists in Salesforce.',
        schema: z.object({
          name: z.string().optional().describe('Full name or partial name to search for'),
          email: z.string().optional().describe('Email address to search for'),
          company: z.string().optional().describe('Company name to search for'),
        }),
        func: async (input) => {
          try {
            const result = await searchPersonInSalesforce(organizationId, input, userId);
            if (result.found && result.data) {
              const record = result.data;
              return `Found ${result.type}: ${record.FirstName} ${record.LastName}\nEmail: ${record.Email || 'N/A'}\nTitle: ${record.Title || 'N/A'}\nCompany: ${(record as any).Company || record.Account?.Name || 'N/A'}\nLast Modified: ${record.LastModifiedDate}\nRecord ID: ${record.Id}`;
            }
            return 'No contact or lead found matching the search criteria.';
          } catch (error) {
            return `Error searching Salesforce: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'query_crm',
        description: `Query Salesforce CRM to get leads, contacts, or opportunities. 

WHEN TO USE:
- User asks: "show leads", "check leads", "review leads", "list my leads", "recent leads"
- User asks: "see contacts", "show contacts", "list contacts"  
- User asks: "show opportunities", "check deals", "list opportunities"

REQUIRED PARAMETER:
- "query" (REQUIRED): A complete SOQL query string. You MUST provide this parameter.

EXAMPLE QUERIES (use these exact formats - NO WHERE clauses):
- For leads: {"query": "SELECT Id, Name, Email, Company, Status FROM Lead ORDER BY CreatedDate DESC LIMIT 10"}
- For contacts: {"query": "SELECT Id, Name, Email, Title FROM Contact ORDER BY CreatedDate DESC LIMIT 10"}
- For opportunities: {"query": "SELECT Id, Name, Amount, StageName FROM Opportunity ORDER BY CreatedDate DESC LIMIT 10"}

CRITICAL RULES - READ CAREFULLY:
1. ALWAYS provide the "query" parameter - NEVER call with empty arguments {}
2. NEVER use WHERE clauses with quotes like: WHERE StageName = 'Closed Won'
   - This causes JSON parsing errors and will fail
   - Example of BAD query: SELECT ... FROM Lead WHERE StageName = 'Closed Won' ❌
3. For filtered searches (like "late stage leads"):
   - Option A: Use search_salesforce tool with name/email/company
   - Option B: Get all leads with query_crm, then filter in your response
4. Only use simple SELECT statements with ORDER BY and LIMIT
   - Good: SELECT Id, Name FROM Lead ORDER BY CreatedDate DESC LIMIT 10 ✅
   - Bad: SELECT ... WHERE Status = 'value' ❌`,
        schema: z.object({
          query: z.string().describe('REQUIRED: Complete SOQL query string WITHOUT WHERE clauses. Example: "SELECT Id, Name, Email, Company, Status FROM Lead ORDER BY CreatedDate DESC LIMIT 10". Note: StageName only exists on Opportunity, not Lead. Use Status for Lead. This parameter is MANDATORY. DO NOT include WHERE clauses with quotes.'),
        }),
        func: async (input) => {
          try {
            // Validate that query doesn't contain WHERE clauses with quotes
            // This causes JSON parsing errors in the LLM's function calling
            if (input.query && /WHERE\s+.*['"]/.test(input.query)) {
              return `❌ Error: SOQL queries with WHERE clauses containing quotes are not supported due to JSON parsing limitations.

Instead, use the search_salesforce tool for filtered searches.

Examples:
- To find late-stage opportunities: Use search_salesforce with name/email
- To find specific leads by status: Use search_salesforce instead
- To get all leads: SELECT Id, Name, Email, Company FROM Lead ORDER BY CreatedDate DESC LIMIT 10

For simple listing queries (no WHERE clause), use query_crm.
For filtered searches, use search_salesforce.`;
            }

            console.log('🔍 [query_crm] Executing SOQL:', input.query);

            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Query timeout after 10 seconds')), 10000)
            );

            const queryPromise = querySalesforce(organizationId, input.query, userId);

            const result = await Promise.race([queryPromise, timeoutPromise]) as any;

            console.log('✅ [query_crm] Query completed, records:', result?.totalSize || 0);

            if (result.records && result.records.length > 0) {
              const records = result.records.slice(0, 10); // Limit to 10 for readability
              const formatted = records.map((r: any, i: number) => {
                const fields = Object.entries(r)
                  .filter(([key]) => key !== 'attributes')
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(', ');
                return `${i + 1}. ${fields}`;
              }).join('\n');
              return `Found ${result.totalSize} record(s). Showing first ${records.length}:\n\n${formatted}`;
            }
            return 'No records found.';
          } catch (error) {
            console.error('❌ [query_crm] Error:', error);
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';

            // Provide helpful error messages
            if (errorMsg.includes('MALFORMED_QUERY') || errorMsg.includes('unexpected token')) {
              return `❌ Query syntax error. Please use simple SELECT statements without WHERE clauses containing quotes. For filtered searches, use the search_salesforce tool instead.`;
            }

            return `Error executing query: ${errorMsg}. Try a simpler query or use search_salesforce instead.`;
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'create_lead',
        description: 'Create a new lead in Salesforce. Use this for prospects who are not yet customers.',
        schema: z.object({
          firstName: z.string().describe('First name of the lead'),
          lastName: z.string().describe('Last name of the lead'),
          company: z.string().describe('Company name'),
          email: z.string().optional().describe('Email address'),
          title: z.string().optional().describe('Job title'),
          phone: z.string().optional().describe('Phone number'),
        }),
        func: async (input) => {
          try {
            const result = await createSalesforceLead(organizationId, input, userId);

            // Log activity
            await logActivity(organizationId, userId, 'lead_created', 'crm', {
              provider: 'salesforce',
              name: `${input.firstName} ${input.lastName}`,
              company: input.company,
              email: input.email,
              recordId: result.id
            });

            return `✅ Lead created successfully!\nName: ${input.firstName} ${input.lastName}\nCompany: ${input.company}\nRecord ID: ${result.id}`;
          } catch (error) {
            return `Error creating lead: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'create_contact',
        description: 'Create a new contact in Salesforce. Use this for established relationships or customers.',
        schema: z.object({
          firstName: z.string().describe('First name of the contact'),
          lastName: z.string().describe('Last name of the contact'),
          email: z.string().optional().describe('Email address'),
          title: z.string().optional().describe('Job title'),
          phone: z.string().optional().describe('Phone number'),
          company: z.string().optional().describe('Company/Account name'),
        }),
        func: async (input) => {
          try {
            const result = await createSalesforceContact(organizationId, input, userId);

            // Log activity
            await logActivity(organizationId, userId, 'contact_created', 'crm', {
              provider: 'salesforce',
              name: `${input.firstName} ${input.lastName}`,
              company: input.company,
              email: input.email,
              recordId: result.id
            });

            return `✅ Contact created successfully!\nName: ${input.firstName} ${input.lastName}\n${input.company ? `Company: ${input.company}\n` : ''}Record ID: ${result.id}`;
          } catch (error) {
            return `Error creating contact: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'add_note',
        description: 'Add a note to a Salesforce record (contact or lead). Use this to log conversations, meetings, or important information.',
        schema: z.object({
          recordId: z.string().describe('Salesforce record ID (contact or lead ID)'),
          note: z.string().describe('Note content to add'),
        }),
        func: async (input) => {
          try {
            const result = await addSalesforceNote(organizationId, input.recordId, input.note);
            return `✅ Note added successfully!\nNote ID: ${result.id}`;
          } catch (error) {
            return `Error adding note: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'create_task',
        description: 'Create a follow-up task in Salesforce. Use this to set reminders or action items.',
        schema: z.object({
          subject: z.string().describe('Task subject/description'),
          relatedToId: z.string().optional().describe('Related record ID (contact, lead, or opportunity)'),
          dueDate: z.string().optional().describe('Due date in YYYY-MM-DD format'),
          priority: z.enum(['High', 'Normal', 'Low']).optional().describe('Task priority'),
        }),
        func: async (input) => {
          try {
            const result = await createSalesforceTask(organizationId, input, userId);
            return `✅ Task created successfully!\nSubject: ${input.subject}\n${input.dueDate ? `Due: ${input.dueDate}\n` : ''}Task ID: ${result.id}`;
          } catch (error) {
            return `Error creating task: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
        },
      })
    );
  }

  // Monday.com Tools
  if (options.hasMonday) {
    tools.push(
      new DynamicStructuredTool({
        name: 'search_monday',
        description: 'Search for a specific contact in Monday.com CRM boards by name or email. Use when user asks about a specific person. To view all leads/contacts, tell user to ask more specifically about who they want to find.',
        schema: z.object({
          name: z.string().optional().describe('Full name or partial name to search for (required if no email)'),
          email: z.string().optional().describe('Email address to search for (required if no name)'),
        }),
        func: async (input) => {
          try {
            if (!input.name && !input.email) {
              return 'Please specify a name or email to search for. Example: "Find John Smith in Monday" or "Search for john@example.com in Monday.com"';
            }

            const result = await searchPersonInMonday(organizationId, input, userId);
            if (result.found && result.data) {
              const contact = result.data;
              return `Found in Monday.com: ${contact.name}\nEmail: ${contact.email || 'N/A'}\nTitle: ${contact.title || 'N/A'}\nCompany: ${contact.company || 'N/A'}\nBoard ID: ${contact.board_id}`;
            }
            return `No contact found in Monday.com CRM boards matching "${input.name || input.email}". The person may not exist in your Monday.com workspace yet.`;
          } catch (error) {
            return `Error searching Monday.com: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'create_monday_contact',
        description: 'Create a new contact in Monday.com CRM board. Use this to add prospects to Monday.com.',
        schema: z.object({
          firstName: z.string().optional().describe('First name'),
          lastName: z.string().describe('Last name'),
          email: z.string().optional().describe('Email address'),
          title: z.string().optional().describe('Job title'),
          company: z.string().optional().describe('Company name'),
        }),
        func: async (input) => {
          try {
            const result = await createMondayContact(organizationId, input, userId);
            return `✅ Contact created in Monday.com!\nName: ${input.firstName || ''} ${input.lastName}\nContact ID: ${result.id}`;
          } catch (error) {
            return `Error creating Monday.com contact: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
        },
      })
    );
  }

  // Gmail Tools
  if (options.hasGmail) {
    tools.push(
      new DynamicStructuredTool({
        name: 'create_gmail_draft',
        description: 'Create an email draft in Gmail with COMPLETE email content. The draft will be saved in Gmail Drafts folder. ALWAYS include greeting, message body, and closing - NEVER leave body empty!',
        schema: z.object({
          to: z.string().describe('Recipient email address'),
          subject: z.string().describe('Email subject line'),
          body: z.string().describe('COMPLETE email body with greeting, message (2-4 paragraphs), and professional closing. Include sender name at end. REQUIRED - cannot be empty!'),
        }),
        func: async (input) => {
          try {
            const sanitizedBody = sanitizeEmailBody(input.body);
            console.log('📧 [Tools] Preparing Gmail draft', {
              to: input.to,
              subject: input.subject,
              originalLength: input.body?.length ?? 0,
              sanitizedLength: sanitizedBody.length,
            });

            if (!sanitizedBody.trim()) {
              throw new Error('Sanitized email body is empty. Regenerate a complete draft before saving.');
            }

            const result = await createGmailDraft(
              organizationId,
              { ...input, body: sanitizedBody },
              userId
            );

            // Log activity
            await logActivity(organizationId, userId, 'email_draft_created', 'email', {
              provider: 'gmail',
              to: input.to,
              subject: input.subject,
              draftId: result.id
            });

            return `✅ Email draft created successfully in Gmail!\nTo: ${input.to}\nSubject: ${input.subject}\nDraft ID: ${result.id}\n\nThe draft is now in your Gmail Drafts folder and ready to send.`;
          } catch (error) {
            return `Error creating Gmail draft: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'send_gmail_email',
        description: 'Send an email immediately via Gmail. Use this when user explicitly wants to send (not just draft) an email.',
        schema: z.object({
          to: z.string().describe('Recipient email address'),
          subject: z.string().describe('Email subject line'),
          body: z.string().describe('Email body content (can include HTML formatting)'),
        }),
        func: async (input) => {
          try {
            const sanitizedBody = sanitizeEmailBody(input.body);
            console.log('📧 [Tools] Sending Gmail email', {
              to: input.to,
              subject: input.subject,
              originalLength: input.body?.length ?? 0,
              sanitizedLength: sanitizedBody.length,
            });

            if (!sanitizedBody.trim()) {
              throw new Error('Sanitized email body is empty. Regenerate a complete email before sending.');
            }

            await sendGmailEmail(
              organizationId,
              { ...input, body: sanitizedBody },
              userId
            );

            // Log activity
            await logActivity(organizationId, userId, 'email_sent', 'email', {
              provider: 'gmail',
              to: input.to,
              subject: input.subject
            });

            return `✅ Email sent successfully via Gmail!\nTo: ${input.to}\nSubject: ${input.subject}\n\nThe email has been sent.`;
          } catch (error) {
            return `Error sending Gmail email: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'create_google_calendar_event',
        description: 'Create a calendar event in Google Calendar. Use this when user wants to schedule a meeting or add an event.',
        schema: z.object({
          title: z.string().describe('Event title/summary'),
          start: z.string().describe('Start date/time in ISO 8601 format (e.g., 2025-10-15T14:00:00)'),
          end: z.string().describe('End date/time in ISO 8601 format'),
          description: z.string().optional().describe('Event description or agenda'),
          attendees: z.array(z.string()).optional().describe('Array of attendee email addresses'),
          location: z.string().optional().describe('Meeting location (physical or virtual link)'),
        }),
        func: async (input) => {
          try {
            const result = await createGoogleCalendarEvent(
              organizationId,
              {
                summary: input.title,
                start: input.start,
                end: input.end,
                description: input.description,
                attendees: input.attendees,
                location: input.location,
              },
              userId
            );

            // Log activity
            await logActivity(organizationId, userId, 'meeting_scheduled', 'calendar', {
              provider: 'google',
              title: input.title,
              start: input.start,
              attendees: input.attendees,
              eventId: result.id
            });

            return `✅ Calendar event created successfully in Google Calendar!\nTitle: ${input.title}\nStart: ${new Date(input.start).toLocaleString()}\nEnd: ${new Date(input.end).toLocaleString()}\n${input.attendees ? `Attendees: ${input.attendees.join(', ')}\n` : ''}Event ID: ${result.id}`;
          } catch (error) {
            return `Error creating Google Calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'search_gmail_emails',
        description: 'Search the user\'s Gmail for emails matching a query. Use this when user asks about emails, messages from someone, or wants to find specific conversations. Supports Gmail search syntax. For empty queries, use a space " ".',
        schema: z.object({
          query: z.string().describe('Gmail search query (e.g., "from:john@example.com", "subject:proposal", "is:unread"). Use " " for all emails.'),
          maxResults: z.number().optional().default(10).describe('Maximum number of emails to return (default 10)'),
        }),
        func: async (input) => {
          try {
            const emails = await searchGmailEmails(organizationId, input.query || ' ', userId, input.maxResults);
            if (emails.length === 0) {
              return `No emails found matching "${input.query}"`;
            }

            let response = `Found ${emails.length} email(s) matching "${input.query}":\n\n`;
            emails.forEach((email: any, index: number) => {
              const from = email.from || 'Unknown';
              const subject = email.subject || '(No subject)';
              const date = email.date || 'Unknown date';
              const preview = email.snippet?.substring(0, 100) || '';

              response += `${index + 1}. From: ${from}\n`;
              response += `   Subject: ${subject}\n`;
              response += `   Date: ${date}\n`;
              response += `   Preview: ${preview}...\n\n`;
            });

            return response;
          } catch (error) {
            return `Error searching Gmail: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'search_calendar_events',
        description: 'Search the user\'s Google Calendar for events. Use this when user asks about their calendar, meetings, or schedule. Searches for events in a time range.',
        schema: z.object({
          timeMin: z.string().optional().describe('Start time in ISO 8601 format (e.g., "2025-11-26T00:00:00Z"). Defaults to now.'),
          timeMax: z.string().optional().describe('End time in ISO 8601 format (e.g., "2025-11-30T23:59:59Z"). Defaults to 30 days from now.'),
          maxResults: z.number().optional().default(10).describe('Maximum number of events to return (default 10)'),
        }),
        func: async (input) => {
          try {
            const { getGoogleCalendarEvents } = await import('./gmail');
            const events = await getGoogleCalendarEvents(
              organizationId,
              userId,
              {
                startDate: input.timeMin,
                endDate: input.timeMax,
                maxResults: input.maxResults
              }
            );

            if (events.length === 0) {
              return 'No calendar events found in the specified time range.';
            }

            let response = `Found ${events.length} calendar event(s):\n\n`;
            events.forEach((event: any, index: number) => {
              const start = event.start?.dateTime || event.start?.date;
              const end = event.end?.dateTime || event.end?.date;
              const attendees = event.attendees?.map((a: any) => a.email).join(', ') || 'No attendees';

              response += `${index + 1}. ${event.summary}\n`;
              response += `   When: ${new Date(start).toLocaleString()} - ${new Date(end).toLocaleString()}\n`;
              if (event.location) response += `   Location: ${event.location}\n`;
              if (event.description) response += `   Description: ${event.description}\n`;
              response += `   Attendees: ${attendees}\n\n`;
            });

            return response;
          } catch (error) {
            return `Error searching Google Calendar: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
        },
      })
    );
  }

  // Outlook Tools
  if (options.hasOutlook) {
    tools.push(
      new DynamicStructuredTool({
        name: 'create_email_draft',
        description: 'Create an email draft in Outlook with COMPLETE email content. The draft will be saved in Outlook Drafts folder. ALWAYS include greeting, message body, and closing - NEVER leave body empty!',
        schema: z.object({
          to: z.string().describe('Recipient email address'),
          subject: z.string().describe('Email subject line'),
          body: z.string().describe('COMPLETE email body with greeting, message (2-4 paragraphs), and professional closing. Include sender name at end. REQUIRED - cannot be empty!'),
        }),
        func: async (input) => {
          try {
            const sanitizedBody = sanitizeEmailBody(input.body);
            console.log('📧 [Tools] Preparing Outlook draft', {
              to: input.to,
              subject: input.subject,
              originalLength: input.body?.length ?? 0,
              sanitizedLength: sanitizedBody.length,
            });

            if (!sanitizedBody.trim()) {
              throw new Error('Sanitized email body is empty. Regenerate a complete draft before saving.');
            }

            const result = await createEmailDraft(
              organizationId,
              { ...input, body: sanitizedBody },
              userId
            );

            // Log activity
            await logActivity(organizationId, userId, 'email_draft_created', 'email', {
              provider: 'outlook',
              to: input.to,
              subject: input.subject,
              draftId: result.id
            });

            return `✅ Email draft created successfully in Outlook!\nTo: ${input.to}\nSubject: ${input.subject}\nDraft ID: ${result.id}\n\nThe draft is now in your Outlook Drafts folder.`;
          } catch (error) {
            return `Error creating Outlook draft: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'send_email',
        description: 'Send an email immediately via Outlook. Use this when user explicitly wants to send an email right away.',
        schema: z.object({
          to: z.string().describe('Recipient email address'),
          subject: z.string().describe('Email subject line'),
          body: z.string().describe('Email body content (HTML supported)'),
        }),
        func: async (input) => {
          try {
            const sanitizedBody = sanitizeEmailBody(input.body);
            console.log('📧 [Tools] Sending Outlook email', {
              to: input.to,
              subject: input.subject,
              originalLength: input.body?.length ?? 0,
              sanitizedLength: sanitizedBody.length,
            });

            if (!sanitizedBody.trim()) {
              throw new Error('Sanitized email body is empty. Regenerate a complete email before sending.');
            }

            await sendEmail(
              organizationId,
              { ...input, body: sanitizedBody },
              userId
            );
            return `✅ Email sent successfully via Outlook!\nTo: ${input.to}\nSubject: ${input.subject}\n\nThe email has been sent.`;
          } catch (error) {
            return `Error sending Outlook email: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'create_calendar_event',
        description: 'Create a calendar event in Outlook Calendar. Use this to schedule meetings or add events to the calendar.',
        schema: z.object({
          subject: z.string().describe('Event subject/title'),
          start: z.string().describe('Start date/time in ISO 8601 format'),
          end: z.string().describe('End date/time in ISO 8601 format'),
          body: z.string().optional().describe('Event description/body'),
          attendees: z.array(z.string()).optional().describe('Array of attendee email addresses'),
          location: z.string().optional().describe('Meeting location'),
        }),
        func: async (input) => {
          try {
            const result = await createCalendarEvent(organizationId, input, userId);

            // Log activity
            await logActivity(organizationId, userId, 'meeting_scheduled', 'calendar', {
              provider: 'outlook',
              title: input.subject,
              start: input.start,
              attendees: input.attendees,
              eventId: result.id
            });

            return `✅ Calendar event created successfully in Outlook!\nSubject: ${input.subject}\nStart: ${new Date(input.start).toLocaleString()}\nEnd: ${new Date(input.end).toLocaleString()}\n${input.attendees ? `Attendees: ${input.attendees.join(', ')}\n` : ''}Event ID: ${result.id}`;
          } catch (error) {
            return `Error creating Outlook calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
        },
      }),

      new DynamicStructuredTool({
        name: 'search_emails',
        description: 'Search the user\'s Outlook for emails matching a query. Use this when user asks about emails or messages from someone. For all emails, use an empty query.',
        schema: z.object({
          query: z.string().describe('Search query for email subject, sender, or content'),
          limit: z.number().optional().default(5).describe('Maximum number of emails to return (default 5)'),
        }),
        func: async (input) => {
          try {
            const emails = await searchEmails(organizationId, input.query, userId, input.limit);
            if (emails.length === 0) {
              return `No emails found matching "${input.query}"`;
            }

            let response = `Found ${emails.length} email(s) matching "${input.query}":\n\n`;
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
          } catch (error) {
            return `Error searching Outlook: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
        },
      })
    );
  }

  // Add web browsing tools (always available)
  tools.push(
    new DynamicStructuredTool({
      name: 'web_search',
      description: `Search the web for real-time information about any topic. Use this when you need:
- Current news, events, or trending topics
- Company information, websites, or recent updates  
- Industry research, market data, or competitive analysis
- Technical documentation or how-to guides
- Any information not in your training data
Examples: "Search for latest AI news", "Find company website for Acme Corp", "Search for best CRM practices 2024"`,
      schema: z.object({
        query: z.string().describe('The search query - be specific and include relevant keywords'),
      }),
      func: async (input) => {
        try {
          console.log('🔍 [Web Search] Searching for:', input.query);

          const { results, searchUrl } = await searchWeb(input.query, 5);

          if (results.length === 0) {
            return `No search results found for "${input.query}". Try rephrasing your search query.`;
          }

          const formatted = formatSearchResultsForAI(results, input.query);

          console.log('✅ [Web Search] Returning', results.length, 'results');
          return formatted;
        } catch (error) {
          console.error('❌ [Web Search] Error:', error);
          return `Error performing web search: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again with a different query.`;
        }
      },
    }),

    new DynamicStructuredTool({
      name: 'browse_url',
      description: `Navigate to a specific URL and read its content. Use this to:
- Read company websites, product pages, or documentation
- Extract information from articles or blog posts
- Verify information from a specific source
- Get real-time data from web pages
Examples: "Browse https://example.com/about", "Read the pricing page at https://company.com/pricing"`,
      schema: z.object({
        url: z.string().describe('The full URL to navigate to (must start with http:// or https://)'),
        question: z.string().optional().describe('Optional: What specific information are you looking for on this page?'),
      }),
      func: async (input) => {
        try {
          console.log('🌐 [Browse URL] Navigating to:', input.url);

          if (!input.url.startsWith('http://') && !input.url.startsWith('https://')) {
            return 'Error: URL must start with http:// or https://';
          }

          const { title, content, url } = await browseUrl(input.url);
          const formatted = formatBrowsedContentForAI({ title, content, url });

          let response = formatted;
          if (input.question) {
            response += `\n\n**User's specific question:** ${input.question}\n`;
            response += `Please focus on answering this question using the content above.\n`;
          }

          console.log('✅ [Browse URL] Successfully extracted content from:', input.url);
          return response;
        } catch (error) {
          console.error('❌ [Browse URL] Error:', error);
          return `Error browsing URL "${input.url}": ${error instanceof Error ? error.message : 'Unknown error'}. The website may be blocking automated access or is temporarily unavailable.`;
        }
      },
    })
  );

  return tools;
}

