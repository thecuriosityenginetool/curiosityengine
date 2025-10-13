# 🧪 Salesforce AI Chat - Testing Guide

## Overview

This guide provides comprehensive test cases for the Salesforce AI Chat system. Follow these tests in order to verify all functionality works correctly.

---

## Prerequisites

Before testing:
- ✅ Database setup complete (run `verify-database-setup.sql`)
- ✅ Deployed to Vercel
- ✅ All environment variables set
- ✅ Salesforce connected (for CRM tests)

---

## Test Suite 1: Basic Chat Functionality

### Test 1.1: Simple Message
**Input:** `Hello! How are you?`

**Expected Result:**
- ✅ Response appears in real-time (streaming)
- ✅ Message is friendly and professional
- ✅ No errors in console

---

### Test 1.2: User Profile Context
**Input:** `What's my name and company?`

**Expected Result:**
- ✅ AI responds with your profile information
- ✅ Shows: Name, Role, Company from your user profile

---

### Test 1.3: Message Persistence
**Steps:**
1. Send a message: `Remember this: Test 123`
2. Refresh the page
3. Click on the same chat in history
4. Check if message is still there

**Expected Result:**
- ✅ Message history is preserved
- ✅ Chat loads from database
- ✅ All messages appear in correct order

---

## Test Suite 2: Salesforce Search Operations

### Test 2.1: Search by Full Name
**Input:** `Who is John Smith?`

**Expected Result:**
- ✅ 🔍 icon appears during search
- ✅ AI returns contact details OR "not found"
- ✅ If found, shows: Name, Email, Title, Company, Record ID

**Sample Success Response:**
```
Found Contact: John Smith
Email: john.smith@acme.com
Title: VP of Sales
Company: Acme Corp
Last Modified: 2025-10-10
Record ID: 003xx000004TmiQAAS
```

---

### Test 2.2: Search by Email
**Input:** `Find the contact with email john@example.com`

**Expected Result:**
- ✅ 🔍 icon appears
- ✅ Searches by email address
- ✅ Returns contact if found

---

### Test 2.3: Search by Company
**Input:** `Show me contacts from Acme Corp`

**Expected Result:**
- ✅ AI searches for company name
- ✅ Returns relevant contacts
- ✅ May return multiple results

---

### Test 2.4: Search Not Found
**Input:** `Who is Nonexistent Person XYZ?`

**Expected Result:**
- ✅ 🔍 icon appears
- ✅ AI responds with "No contact or lead found"
- ✅ Friendly message suggesting alternatives

---

## Test Suite 3: Lead Creation

### Test 3.1: Create Basic Lead
**Input:** `Create a lead for Jane Doe at TechStart`

**Expected Result:**
- ✅ ✏️ icon appears
- ✅ AI creates lead in Salesforce
- ✅ Response shows: Name, Company, Record ID
- ✅ **Verify in Salesforce:** Lead appears in Leads tab

**Sample Response:**
```
✅ Lead created successfully!
Name: Jane Doe
Company: TechStart
Record ID: 00Qxx000003WxyzAAC
```

---

### Test 3.2: Create Lead with Details
**Input:** `Create a lead for Bob Johnson at SalesCo, he's the CMO, email bob@salesco.com`

**Expected Result:**
- ✅ Lead created with all details
- ✅ Email and title populated
- ✅ **Verify in Salesforce:** Check all fields are filled

---

### Test 3.3: Create Lead with Context
**Input:** `I just met Sarah Miller, the CEO of InnovateTech at a conference. Add her as a lead.`

**Expected Result:**
- ✅ AI extracts: Name (Sarah Miller), Title (CEO), Company (InnovateTech)
- ✅ Lead created successfully
- ✅ Natural language understanding works

---

## Test Suite 4: Contact Creation

### Test 4.1: Create Contact
**Input:** `Add Michael Chen as a contact at DataCorp`

**Expected Result:**
- ✅ ✏️ icon appears
- ✅ Contact created (not lead)
- ✅ Shows success message with Record ID
- ✅ **Verify in Salesforce:** Contact appears in Contacts

---

### Test 4.2: Lead vs Contact Decision
**Input:** `I'm working with an existing client, add them as a contact: Lisa Wong from Enterprise LLC`

**Expected Result:**
- ✅ AI creates Contact (not Lead) based on context "existing client"
- ✅ Proper record type chosen

---

## Test Suite 5: Update Operations

### Test 5.1: Update Contact Email
**Steps:**
1. First search: `Who is John Smith?`
2. Then update: `Update his email to john.smith.new@example.com`

**Expected Result:**
- ✅ 📝 icon appears
- ✅ AI uses Record ID from previous search
- ✅ Email updated successfully
- ✅ **Verify in Salesforce:** Email changed

---

### Test 5.2: Update Multiple Fields
**Input:** `Update Jane Doe's phone to 555-1234 and title to Senior CMO`

**Expected Result:**
- ✅ Multiple fields updated at once
- ✅ Success message lists updated fields
- ✅ **Verify in Salesforce:** Both fields changed

---

### Test 5.3: Update Without Context (Should Ask)
**Input:** `Update the email to test@example.com`

**Expected Result:**
- ✅ AI asks "Which contact/lead?"
- ✅ Or searches for most recent mention
- ✅ Handles ambiguity gracefully

---

## Test Suite 6: Notes and Tasks

### Test 6.1: Add Note
**Steps:**
1. Search: `Find John Smith`
2. Add note: `Add a note that we had a great meeting today and he's interested in the enterprise plan`

**Expected Result:**
- ✅ 📌 icon appears
- ✅ Note added to John Smith's record
- ✅ Success message shows Note ID
- ✅ **Verify in Salesforce:** Note appears on contact

---

### Test 6.2: Create Task
**Input:** `Remind me to follow up with Jane Doe in 3 days`

**Expected Result:**
- ✅ ✅ icon appears
- ✅ Task created with due date
- ✅ Task linked to Jane Doe
- ✅ **Verify in Salesforce:** Task appears in Activities

---

### Test 6.3: Create Task with Priority
**Input:** `Create a high priority task to send proposal to Bob by Friday`

**Expected Result:**
- ✅ Task created with High priority
- ✅ Due date set correctly
- ✅ Subject describes the task
- ✅ **Verify in Salesforce:** Priority is High

---

## Test Suite 7: Activity History

### Test 7.1: Get Recent Activity
**Steps:**
1. Search: `Who is John Smith?`
2. Get activity: `What's my recent activity with him?`

**Expected Result:**
- ✅ 📊 icon appears
- ✅ Shows recent tasks, events, notes
- ✅ Formatted nicely with dates
- ✅ Limited to most recent items

**Sample Response:**
```
Recent Activity:

📋 Tasks (2):
- Follow up call (Completed) - 10/10/2025
- Send proposal (Not Started) - 10/15/2025

📝 Notes (1):
- Great meeting - 10/10/2025
```

---

## Test Suite 8: Calendar Integration

### Test 8.1: View Calendar
**Input:** `What's on my calendar today?`

**Expected Result:**
- ✅ Shows calendar events
- ✅ If Salesforce connected, shows CRM matches
- ✅ Displays event times and descriptions

---

### Test 8.2: Calendar with CRM Context
**Setup:** Have a calendar event with attendee who exists in Salesforce

**Input:** `Who am I meeting with tomorrow?`

**Expected Result:**
- ✅ Shows event details
- ✅ Shows matched CRM contact/lead
- ✅ Shows: Name, Title, Company, Last contact date
- ✅ Rich context from Salesforce

**Sample Response:**
```
You have 1 event tomorrow:

📅 Demo with Acme Corp (2:00 PM)
  CRM Matches:
  - John Smith (Contact) - VP of Sales at Acme Corp (last contacted 5 days ago)
```

---

### Test 8.3: Calendar Without CRM Match
**Input:** `What events do I have this week?`

**Expected Result:**
- ✅ Shows all events
- ✅ For events without CRM match, shows basic info only
- ✅ No errors if attendees not found

---

## Test Suite 9: Complex Queries

### Test 9.1: Multi-Step Workflow
**Conversation:**
1. `Find Jane Doe`
2. `Add a note about our call`
3. `Create a task to follow up next week`
4. `Update her email to jane.doe@newco.com`

**Expected Result:**
- ✅ All steps execute in sequence
- ✅ AI remembers context (Jane Doe's Record ID)
- ✅ No need to specify record each time
- ✅ All operations succeed

---

### Test 9.2: Bulk Information Request
**Input:** `Show me all the contacts at Acme Corp and their roles`

**Expected Result:**
- ✅ AI searches for company
- ✅ Returns multiple contacts
- ✅ Lists names and titles
- ✅ Formatted nicely

---

### Test 9.3: Complex Natural Language
**Input:** `I need to schedule a follow-up with the VP of Sales at TechStart who I met last week at the conference`

**Expected Result:**
- ✅ AI searches by title and company
- ✅ Finds relevant contact
- ✅ Offers to create task
- ✅ Handles complex request intelligently

---

## Test Suite 10: Error Handling

### Test 10.1: Invalid Record ID
**Input:** `Update record 123ABC with email test@example.com`

**Expected Result:**
- ✅ Graceful error message
- ✅ Explains record not found
- ✅ Suggests searching first

---

### Test 10.2: Missing Required Fields
**Input:** `Create a lead` (no name or company)

**Expected Result:**
- ✅ AI asks for required information
- ✅ "I need at least a name and company to create a lead"
- ✅ Conversational error handling

---

### Test 10.3: Network/API Error
**Setup:** Disconnect internet or break Salesforce connection

**Input:** `Find John Smith`

**Expected Result:**
- ✅ Error message displayed
- ✅ "There was an error connecting to Salesforce"
- ✅ Doesn't crash the chat
- ✅ Suggests checking connection

---

### Test 10.4: Salesforce Not Connected
**Setup:** Disconnect Salesforce integration

**Input:** `Find contacts at Acme Corp`

**Expected Result:**
- ✅ AI responds: "Salesforce CRM is not connected"
- ✅ Provides guidance to connect
- ✅ Chat continues working for non-CRM queries

---

## Test Suite 11: Streaming & UX

### Test 11.1: Streaming Appears
**Input:** Any message

**Expected Result:**
- ✅ Text appears word-by-word (not all at once)
- ✅ Smooth animation
- ✅ No flickering or jumping

---

### Test 11.2: Tool Indicators
**Input:** `Create a lead for Test Person`

**Expected Result:**
- ✅ ✏️ icon appears when tool starts
- ✅ "Executing create lead..." shows briefly
- ✅ Icon/text disappears after completion
- ✅ Final response is clean (no execution artifacts)

---

### Test 11.3: Long Response
**Input:** `Tell me everything about Salesforce CRM and how it works`

**Expected Result:**
- ✅ Long response streams smoothly
- ✅ No timeout errors
- ✅ All text appears eventually
- ✅ Chat remains scrollable

---

## Test Suite 12: Edge Cases

### Test 12.1: Special Characters in Names
**Input:** `Create a contact for María José O'Connor at Data-Tech Inc.`

**Expected Result:**
- ✅ Handles special characters correctly
- ✅ Name stored properly in Salesforce
- ✅ No encoding errors

---

### Test 12.2: Very Long Note
**Input:** Add a note with 500+ words

**Expected Result:**
- ✅ Full note saved to Salesforce
- ✅ No truncation
- ✅ Success message returned

---

### Test 12.3: Concurrent Requests
**Steps:**
1. Send message: `Find John Smith`
2. Before it finishes, send: `Create lead for Jane`

**Expected Result:**
- ✅ Both requests process correctly
- ✅ No race conditions
- ✅ Responses appear in order

---

## Test Suite 13: Performance

### Test 13.1: Response Time
**Input:** `Who is John Smith?`

**Expected Result:**
- ✅ Tool indicator appears < 500ms
- ✅ Salesforce search completes < 2 seconds
- ✅ Full response < 5 seconds

---

### Test 13.2: Caching
**Steps:**
1. Search: `Find John Smith`
2. Wait 2 seconds
3. Search again: `Find John Smith`

**Expected Result:**
- ✅ Second search is faster (cache hit)
- ✅ Same result returned
- ✅ No duplicate API calls (check network tab)

---

### Test 13.3: Cache Expiry
**Steps:**
1. Search: `Find John Smith`
2. Wait 6 minutes (cache TTL is 5 min)
3. Search again: `Find John Smith`

**Expected Result:**
- ✅ Cache expired
- ✅ New API call made to Salesforce
- ✅ Fresh data returned

---

## Automated Testing Script

Run this in browser console on dashboard:

```javascript
async function runAutomatedTests() {
  console.log('🧪 Running Automated Salesforce AI Chat Tests\n');
  
  const tests = [
    { name: 'Search Contact', query: 'Who is John Smith?' },
    { name: 'Create Lead', query: 'Create a lead for Test Person at Test Co' },
    { name: 'View Calendar', query: 'What\'s on my calendar?' },
    { name: 'Complex Query', query: 'Show me contacts at Acme Corp' },
  ];
  
  for (const test of tests) {
    console.log(`\n📋 Test: ${test.name}`);
    console.log(`Query: "${test.query}"`);
    
    // You would simulate sending the message here
    // For now, just log it
    console.log('✅ Test case defined');
  }
  
  console.log('\n\n✅ All test cases ready!');
  console.log('Run them manually in the chat to verify functionality.');
}

runAutomatedTests();
```

---

## Test Results Template

Use this template to track your testing:

```markdown
## Test Results - [Date]

### Test Suite 1: Basic Chat
- [x] Test 1.1: Simple Message - PASS
- [x] Test 1.2: User Profile Context - PASS
- [ ] Test 1.3: Message Persistence - FAIL (Issue: ...)

### Test Suite 2: Salesforce Search
- [x] Test 2.1: Search by Full Name - PASS
- [ ] Test 2.2: Search by Email - NOT TESTED

... (continue for all test suites)

## Issues Found
1. Issue description
2. Issue description

## Next Steps
- Fix issue #1
- Deploy fix
- Re-test
```

---

## Success Criteria

Your system passes when:

- ✅ All basic chat tests pass
- ✅ All Salesforce search tests pass
- ✅ Can create leads and contacts
- ✅ Can update records
- ✅ Can add notes and tasks
- ✅ Calendar integration works
- ✅ Error handling is graceful
- ✅ Streaming works smoothly
- ✅ No console errors
- ✅ Performance is acceptable

---

## Reporting Issues

If you find bugs:

1. **Check Browser Console** - Copy any error messages
2. **Check Vercel Logs** - Look for server-side errors
3. **Check Salesforce** - Verify data is/isn't being created
4. **Document** - Write down exact steps to reproduce
5. **Test Again** - Ensure it's reproducible

---

## 🎉 Happy Testing!

This comprehensive test suite will ensure your Salesforce AI Chat system is production-ready.

**Found a bug?** That's great! You're one step closer to a perfect system.

**All tests pass?** Congratulations! Your AI sales assistant is ready to use! 🚀

