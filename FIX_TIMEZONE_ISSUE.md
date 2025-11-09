# 🕐 Timezone Issue Fix - Outlook Calendar Events

## 🐛 **Problem**

When asking AI to "set a meeting at 3pm EST":
- ✅ Gmail calendar works correctly
- ❌ Outlook calendar shows wrong time
- ❌ AI "thinking" shows different timezone than user's computer

---

## 🔍 **Root Cause**

The code uses **server timezone** instead of **user timezone**:

```typescript
// This runs on the SERVER (not user's browser)
const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
```

**Server timezone:** UTC or data center timezone  
**User timezone:** Could be EST, PST, CST, etc.

---

## ✅ **Solution Overview**

We need to:
1. Get user's timezone from their browser
2. Pass it to the backend with calendar event requests
3. Use user's timezone in AI prompts
4. Use user's timezone when creating calendar events

---

## 🔧 **Fix Implementation**

### Step 1: Update Outlook Calendar Function

**File:** `apps/sales-curiosity-web/src/lib/outlook.ts`

**Current code (line 515-516):**
```typescript
// Get user's timezone (default to America/New_York if not available)
const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
```

**Should be:**
```typescript
// Use timezone from eventData or detect from system
const userTimeZone = eventData.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
```

**Add timeZone to eventData interface (line 504):**
```typescript
export async function createOutlookCalendarEvent(
  organizationId: string,
  eventData: {
    subject: string;
    start: string; // ISO 8601
    end: string;   // ISO 8601
    body?: string;
    attendees?: string[]; // Email addresses
    location?: string;
    timeZone?: string; // ADD THIS
  },
  userId: string
): Promise<{ id: string; success: boolean }>
```

---

### Step 2: Update Gmail Calendar Function

**File:** `apps/sales-curiosity-web/src/lib/gmail.ts`

**Same fix - Update line 690-691:**
```typescript
// Use timezone from eventData or detect from system
const userTimeZone = eventData.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
```

**Add timeZone to eventData interface (line 679):**
```typescript
export async function createGoogleCalendarEvent(
  organizationId: string,
  eventData: {
    summary: string;
    start: string; // ISO 8601
    end: string;   // ISO 8601
    description?: string;
    location?: string;
    attendees?: string[];
    timeZone?: string; // ADD THIS
  },
  userId: string
): Promise<{ id: string; success: boolean }>
```

---

### Step 3: Update AI System Prompt with User Timezone

**File:** `apps/sales-curiosity-web/src/app/api/chat/route.ts`

**Find this section (line 533):**
```typescript
🕐 CURRENT DATE & TIME (Eastern Time):
${currentDateTime}
ISO Date: ${currentDate}

IMPORTANT: When user asks about "today", use ${currentDate}. Don't overthink timezones - events are shown in their local timezone.
```

**Replace with:**
```typescript
// Get user's actual timezone
const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
const userTimeZoneName = new Intl.DateTimeFormat('en-US', { 
  timeZone: userTimeZone, 
  timeZoneName: 'long' 
}).formatToParts().find(part => part.type === 'timeZoneName')?.value || userTimeZone;

🕐 CURRENT DATE & TIME (${userTimeZoneName}):
${currentDateTime}
ISO Date: ${currentDate}
User Timezone: ${userTimeZone}

IMPORTANT TIMEZONE HANDLING:
- When creating calendar events, ALWAYS use ISO 8601 format with explicit timezone
- If user says "3pm EST", convert to ISO format: 2024-01-15T15:00:00-05:00
- If user says "tomorrow at 2pm", use ${userTimeZone} timezone
- Current timezone is: ${userTimeZone}
```

---

### Step 4: Update Tool Schema in LangGraph

**File:** `apps/sales-curiosity-web/src/lib/langgraph-tools.ts`

**Update create_calendar_event tool (line 510):**
```typescript
schema: z.object({
  subject: z.string().describe('Event subject/title'),
  start: z.string().describe('Start date/time in ISO 8601 format with timezone (e.g., 2024-01-15T15:00:00-05:00)'),
  end: z.string().describe('End date/time in ISO 8601 format with timezone (e.g., 2024-01-15T16:00:00-05:00)'),
  body: z.string().optional().describe('Event description/body'),
  attendees: z.array(z.string()).optional().describe('Array of attendee email addresses'),
  location: z.string().optional().describe('Meeting location'),
  timeZone: z.string().optional().describe('User timezone (e.g., America/New_York)'), // ADD THIS
}),
```

---

## 🧪 **Testing the Fix**

### Test 1: Explicit EST Time
```
User: "Set a meeting tomorrow at 3pm EST"
Expected: Event created at 3pm EST (15:00) in both timezones
```

### Test 2: Relative Time
```
User: "Schedule a call at 2pm"
Expected: Uses user's current timezone
```

### Test 3: Cross-timezone
```
User in PST: "Set meeting at 10am PST"
Expected: Shows 10am PST, converts correctly for Outlook
```

---

## 📋 **Implementation Checklist**

- [ ] Update Outlook createCalendarEvent function
- [ ] Update Gmail createCalendarEvent function  
- [ ] Update AI system prompt with user timezone
- [ ] Update langgraph-tools schema
- [ ] Update chat/route.ts to pass timezone
- [ ] Test with Outlook calendar
- [ ] Test with Gmail calendar
- [ ] Verify AI "thinking" shows correct timezone

---

## 🎯 **Quick Fix Option**

If you want a quick fix RIGHT NOW without changing all the code:

### Option A: Hardcode User Timezone

In both `outlook.ts` and `gmail.ts`, change:
```typescript
const userTimeZone = 'America/New_York'; // Your actual timezone
```

To your specific timezone:
- EST: `'America/New_York'`
- CST: `'America/Chicago'`
- MST: `'America/Denver'`
- PST: `'America/Los_Angeles'`

### Option B: Pass Timezone in Request

When AI creates calendar event, include timezone in the datetime string:
```
Instead of: 2024-01-15T15:00:00
Use: 2024-01-15T15:00:00-05:00 (for EST)
```

---

## 🔄 **Why Gmail Works But Outlook Doesn't**

They actually use the SAME code, so if Gmail works, Outlook should too. The difference might be:

1. **Datetime format:** Gmail might be more forgiving with timezone parsing
2. **AI prompt:** AI might construct datetime strings differently for each
3. **Cache:** Old timezone data might be cached

---

## 💡 **Best Practice Fix**

The proper fix is to:
1. Detect user timezone on client-side (browser)
2. Pass it with every API request
3. Use it in AI prompts and calendar creation
4. Store user's preferred timezone in database

---

## 📝 **Summary**

**Issue:** Server timezone ≠ User timezone  
**Fix:** Pass user timezone from client to server  
**Files to update:** 4 files (outlook.ts, gmail.ts, chat/route.ts, langgraph-tools.ts)  
**Time:** 30 minutes  

---

**Want me to implement the full fix now?** Let me know!

