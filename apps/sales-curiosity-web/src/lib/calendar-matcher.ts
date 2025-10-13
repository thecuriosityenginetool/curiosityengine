/**
 * Calendar-Salesforce Matcher
 * Intelligently matches calendar events to Salesforce contacts and leads
 */

import { searchPersonInSalesforce } from './salesforce';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  type?: string;
  attendees?: string[];
}

export interface EnrichedCalendarEvent extends CalendarEvent {
  salesforceMatches?: {
    email: string;
    name?: string;
    recordId?: string;
    recordType?: 'Contact' | 'Lead';
    title?: string;
    company?: string;
    lastInteraction?: string;
  }[];
}

// Simple in-memory cache (5 minutes TTL)
const matchCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Extract email addresses from event attendees
 */
function extractEmails(event: CalendarEvent): string[] {
  const emails: string[] = [];
  
  // From attendees array
  if (event.attendees && Array.isArray(event.attendees)) {
    emails.push(...event.attendees.filter(a => a.includes('@')));
  }
  
  // From description (backup)
  if (event.description) {
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
    const found = event.description.match(emailRegex);
    if (found) {
      emails.push(...found);
    }
  }
  
  return [...new Set(emails)]; // Remove duplicates
}

/**
 * Extract company names from event title or description
 */
function extractCompanyName(event: CalendarEvent): string | null {
  const text = `${event.title} ${event.description || ''}`;
  
  // Common patterns: "Meeting with Acme Corp", "Demo - Acme Corp", "Acme Corp Discovery Call"
  const patterns = [
    /(?:with|@|-)\s+([A-Z][A-Za-z0-9\s&]+(?:Inc|LLC|Corp|Ltd|Company)?)/,
    /^([A-Z][A-Za-z0-9\s&]+(?:Inc|LLC|Corp|Ltd|Company)?)\s*[-:]/,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

/**
 * Check cache for a match
 */
function getCachedMatch(key: string): any | null {
  const cached = matchCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  matchCache.delete(key);
  return null;
}

/**
 * Store match in cache
 */
function setCachedMatch(key: string, data: any): void {
  matchCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Match calendar events to Salesforce records
 */
export async function matchCalendarEventsToSalesforce(
  events: CalendarEvent[],
  organizationId: string,
  userId: string
): Promise<EnrichedCalendarEvent[]> {
  const enrichedEvents: EnrichedCalendarEvent[] = [];
  
  for (const event of events) {
    const enrichedEvent: EnrichedCalendarEvent = { ...event, salesforceMatches: [] };
    
    // Extract emails from attendees
    const emails = extractEmails(event);
    
    // Try to match each email to Salesforce
    for (const email of emails) {
      const cacheKey = `${organizationId}:${email}`;
      let matchResult = getCachedMatch(cacheKey);
      
      if (!matchResult) {
        try {
          // Search Salesforce for this email
          matchResult = await searchPersonInSalesforce(
            organizationId,
            { email },
            userId
          );
          setCachedMatch(cacheKey, matchResult);
        } catch (error) {
          console.error(`Error searching Salesforce for ${email}:`, error);
          continue;
        }
      }
      
      if (matchResult?.found && matchResult.data) {
        const record = matchResult.data;
        enrichedEvent.salesforceMatches?.push({
          email,
          name: `${record.FirstName || ''} ${record.LastName || ''}`.trim(),
          recordId: record.Id,
          recordType: matchResult.type as 'Contact' | 'Lead',
          title: record.Title,
          company: (record as any).Company || record.Account?.Name,
          lastInteraction: record.LastModifiedDate,
        });
      }
    }
    
    // If no email matches, try company name matching
    if (enrichedEvent.salesforceMatches?.length === 0) {
      const companyName = extractCompanyName(event);
      if (companyName) {
        const cacheKey = `${organizationId}:company:${companyName}`;
        let companyMatches = getCachedMatch(cacheKey);
        
        if (!companyMatches) {
          try {
            // Search for contacts/leads at this company
            companyMatches = await searchPersonInSalesforce(
              organizationId,
              { firstName: '', lastName: companyName }, // Hack: use lastName for company search
              userId
            );
            setCachedMatch(cacheKey, companyMatches);
          } catch (error) {
            console.error(`Error searching Salesforce for company ${companyName}:`, error);
          }
        }
      }
    }
    
    enrichedEvents.push(enrichedEvent);
  }
  
  return enrichedEvents;
}

/**
 * Format enriched event as context string for AI
 */
export function formatEventAsContext(event: EnrichedCalendarEvent): string {
  let context = `📅 ${event.title} (${new Date(event.start).toLocaleString()})`;
  
  if (event.salesforceMatches && event.salesforceMatches.length > 0) {
    context += '\n  CRM Matches:';
    for (const match of event.salesforceMatches) {
      context += `\n  - ${match.name} (${match.recordType})`;
      if (match.title) context += ` - ${match.title}`;
      if (match.company) context += ` at ${match.company}`;
      if (match.lastInteraction) {
        const lastContact = new Date(match.lastInteraction);
        const daysAgo = Math.floor((Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
        context += ` (last contacted ${daysAgo} days ago)`;
      }
    }
  }
  
  return context;
}

/**
 * Build context string for all events
 */
export function buildCalendarContext(events: EnrichedCalendarEvent[]): string {
  if (events.length === 0) {
    return 'No upcoming events found.';
  }
  
  let context = `You have ${events.length} upcoming event${events.length > 1 ? 's' : ''}:\n\n`;
  
  for (const event of events) {
    context += formatEventAsContext(event) + '\n\n';
  }
  
  return context.trim();
}

