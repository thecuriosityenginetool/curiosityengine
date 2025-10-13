/**
 * OpenAI Tool Definitions for Outlook/Microsoft 365 Operations
 * These tools enable the AI to interact with Outlook via function calling
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions';

export const outlookTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "create_email_draft",
      description: "Create an email draft in Outlook. Use this when the user wants to draft an email to someone. The draft will be created in their Outlook drafts folder.",
      parameters: {
        type: "object",
        properties: {
          to: {
            type: "string",
            description: "Recipient email address"
          },
          subject: {
            type: "string",
            description: "Email subject line"
          },
          body: {
            type: "string",
            description: "Email body content (can include HTML formatting)"
          }
        },
        required: ["to", "subject", "body"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_email",
      description: "Send an email immediately via Outlook. Use this when the user explicitly wants to send (not just draft) an email.",
      parameters: {
        type: "object",
        properties: {
          to: {
            type: "string",
            description: "Recipient email address"
          },
          subject: {
            type: "string",
            description: "Email subject line"
          },
          body: {
            type: "string",
            description: "Email body content (can include HTML formatting)"
          }
        },
        required: ["to", "subject", "body"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_calendar_event",
      description: "Create a calendar event in Outlook. Use this when the user wants to schedule a meeting or add an event to their calendar.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Event title/subject"
          },
          start: {
            type: "string",
            description: "Start date/time in ISO 8601 format (e.g., '2025-10-15T14:00:00')"
          },
          end: {
            type: "string",
            description: "End date/time in ISO 8601 format"
          },
          description: {
            type: "string",
            description: "Event description or agenda"
          },
          attendees: {
            type: "array",
            items: { type: "string" },
            description: "Array of attendee email addresses"
          },
          location: {
            type: "string",
            description: "Meeting location (physical or virtual link)"
          }
        },
        required: ["title", "start", "end"]
      }
    }
  }
];

/**
 * Type definitions for tool call arguments
 */
export interface CreateEmailDraftArgs {
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailArgs {
  to: string;
  subject: string;
  body: string;
}

export interface CreateCalendarEventArgs {
  title: string;
  start: string;
  end: string;
  description?: string;
  attendees?: string[];
  location?: string;
}

