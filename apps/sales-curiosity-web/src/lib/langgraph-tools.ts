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
} from './salesforce';

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

  return tools;
}

