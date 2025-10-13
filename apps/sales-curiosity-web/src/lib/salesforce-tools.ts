/**
 * OpenAI Tool Definitions for Salesforce CRM Operations
 * These tools enable the AI to interact with Salesforce via function calling
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions';

export const salesforceTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_salesforce",
      description: "Search for contacts or leads in Salesforce CRM by name, email, or company. Use this when the user asks about a specific person or company in their CRM.",
      parameters: {
        type: "object",
        properties: {
          email: {
            type: "string",
            description: "Email address to search for"
          },
          firstName: {
            type: "string",
            description: "First name of the person"
          },
          lastName: {
            type: "string",
            description: "Last name of the person"
          },
          company: {
            type: "string",
            description: "Company name to search for"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_lead",
      description: "Create a new lead in Salesforce CRM. Use this when the user wants to add a new prospect or lead to their CRM.",
      parameters: {
        type: "object",
        properties: {
          firstName: {
            type: "string",
            description: "First name of the lead"
          },
          lastName: {
            type: "string",
            description: "Last name of the lead"
          },
          company: {
            type: "string",
            description: "Company name (required for leads)"
          },
          email: {
            type: "string",
            description: "Email address"
          },
          title: {
            type: "string",
            description: "Job title"
          },
          phone: {
            type: "string",
            description: "Phone number"
          },
          description: {
            type: "string",
            description: "Additional notes or description"
          }
        },
        required: ["firstName", "lastName", "company"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_contact",
      description: "Create a new contact in Salesforce CRM. Use this when the user wants to add someone they're already working with or have an established relationship with.",
      parameters: {
        type: "object",
        properties: {
          firstName: {
            type: "string",
            description: "First name of the contact"
          },
          lastName: {
            type: "string",
            description: "Last name of the contact"
          },
          email: {
            type: "string",
            description: "Email address"
          },
          title: {
            type: "string",
            description: "Job title"
          },
          company: {
            type: "string",
            description: "Company or account name"
          },
          phone: {
            type: "string",
            description: "Phone number"
          },
          description: {
            type: "string",
            description: "Additional notes or description"
          }
        },
        required: ["firstName", "lastName"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_record",
      description: "Update an existing contact or lead in Salesforce. Use this when the user wants to modify information about a person in their CRM.",
      parameters: {
        type: "object",
        properties: {
          recordId: {
            type: "string",
            description: "The Salesforce ID of the contact or lead to update"
          },
          recordType: {
            type: "string",
            enum: ["Contact", "Lead"],
            description: "Whether this is a Contact or Lead"
          },
          updates: {
            type: "object",
            description: "Fields to update (e.g., {Email: 'new@email.com', Phone: '555-1234'})",
            properties: {
              FirstName: { type: "string" },
              LastName: { type: "string" },
              Email: { type: "string" },
              Title: { type: "string" },
              Company: { type: "string" },
              Phone: { type: "string" },
              MobilePhone: { type: "string" },
              Description: { type: "string" },
              Status: { type: "string" }
            }
          }
        },
        required: ["recordId", "recordType", "updates"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_note",
      description: "Add a note or comment to a contact or lead in Salesforce. Use this when the user wants to log information about an interaction or add context.",
      parameters: {
        type: "object",
        properties: {
          recordId: {
            type: "string",
            description: "The Salesforce ID of the contact or lead"
          },
          note: {
            type: "string",
            description: "The note content to add"
          }
        },
        required: ["recordId", "note"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a task or reminder for a contact or lead in Salesforce. Use this when the user wants to schedule a follow-up or set a reminder.",
      parameters: {
        type: "object",
        properties: {
          recordId: {
            type: "string",
            description: "The Salesforce ID of the contact or lead"
          },
          subject: {
            type: "string",
            description: "Task subject/title (e.g., 'Follow up call', 'Send proposal')"
          },
          description: {
            type: "string",
            description: "Additional details about the task"
          },
          dueDate: {
            type: "string",
            description: "Due date in YYYY-MM-DD format"
          },
          priority: {
            type: "string",
            enum: ["High", "Normal", "Low"],
            description: "Task priority"
          }
        },
        required: ["recordId", "subject"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_activity",
      description: "Get recent activity (tasks, events, notes) for a contact or lead. Use this when the user asks about interaction history or recent activity with someone.",
      parameters: {
        type: "object",
        properties: {
          recordId: {
            type: "string",
            description: "The Salesforce ID of the contact or lead"
          }
        },
        required: ["recordId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_crm",
      description: "Execute a flexible SOQL query against Salesforce. Use this for complex searches or when you need specific data that other tools don't provide. Only use if you know SOQL syntax.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The SOQL query to execute (e.g., 'SELECT Name, Email FROM Contact WHERE Company = \\'Acme Corp\\' LIMIT 10')"
          }
        },
        required: ["query"]
      }
    }
  }
];

/**
 * Type definitions for tool call arguments
 */
export interface SearchSalesforceArgs {
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
}

export interface CreateLeadArgs {
  firstName: string;
  lastName: string;
  company: string;
  email?: string;
  title?: string;
  phone?: string;
  description?: string;
}

export interface CreateContactArgs {
  firstName: string;
  lastName: string;
  email?: string;
  title?: string;
  company?: string;
  phone?: string;
  description?: string;
}

export interface UpdateRecordArgs {
  recordId: string;
  recordType: 'Contact' | 'Lead';
  updates: Record<string, any>;
}

export interface AddNoteArgs {
  recordId: string;
  note: string;
}

export interface CreateTaskArgs {
  recordId: string;
  subject: string;
  description?: string;
  dueDate?: string;
  priority?: 'High' | 'Normal' | 'Low';
}

export interface GetActivityArgs {
  recordId: string;
}

export interface QueryCRMArgs {
  query: string;
}

