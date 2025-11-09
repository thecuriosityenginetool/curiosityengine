# 🔍 Debug Calendar Issue - Instructions

## 🎯 After Deployment (2-3 minutes)

### Step 1: Hard Refresh
Press **Cmd+Shift+R** (or Ctrl+Shift+R) to clear cache

---

### Step 2: Open Browser Console
Press **F12** or **Cmd+Option+I**

---

### Step 3: Ask About Calendar
Type in chat: **"What meetings do I have tomorrow?"**

---

### Step 4: Check Console Logs

Look for these specific log messages:

#### Log 1: Events being sent to API
```
📤 Payload: {messageLength: X, historyLength: Y, model: 'auto'}
```

**Check:** Does it show `eventsCount`? If not, events aren't being passed!

#### Log 2: API receiving events
```
🤖 [Chat API] Request parsed: {
  hasMessage: true,
  eventsCount: 2,  ← Should be > 0
  events: [
    { title: "Meeting with Paul", start: "2025-11-10T..." },
    { title: "Meeting with Tim", start: "2025-11-10T..." }
  ]
}
```

**Check:** 
- Is `eventsCount` > 0? ✅
- Are events showing with titles and dates? ✅

#### Log 3: Calendar context generated
```
📅 Calendar context created with 2 events
📅 Calendar context preview: 
================================
📅 YOUR UPCOMING CALENDAR EVENTS
================================
Current Date: 2025-11-09
Total Events: 2

1. Meeting with Paul
...
```

**Check:** Does it show the formatted calendar context?

---

## 🔍 Diagnosis Guide

### Case A: `eventsCount: 0`
**Problem:** Events aren't being loaded or passed to chat API

**Fix needed:**
- Check if calendar events are loading on dashboard
- Check `/api/calendar` endpoint
- Verify Outlook integration is connected

### Case B: `eventsCount: 2` but AI still says "insufficient"
**Problem:** AI model is ignoring the calendar context

**Possible causes:**
1. Context is too large (model truncating)
2. Model doesn't understand the instructions
3. Calendar context not being added to system prompt properly

**Fix:** We might need to try a different model or simplify the prompt

### Case C: Calendar context preview is empty
**Problem:** Calendar context isn't being generated despite having events

**Fix:** Logic error in calendar context generation

---

## 📋 What to Send Me

After checking console, tell me:

1. **eventsCount:** What number shows?
2. **events array:** Do you see your meeting titles?
3. **Calendar context preview:** Does it show the events formatted?
4. **AI response:** Exact text AI responds with

**Example:**
```
eventsCount: 2
events: [{ title: "Meeting with Paul", start: "..." }, ...]
Calendar context preview: Shows formatted events ✅
AI response: "The provided functions are insufficient..."
```

This will tell me exactly where the issue is!

---

## 🎯 Quick Tests

### Test 1: Check Events Load
1. Refresh dashboard
2. Look at right sidebar "Upcoming Events"
3. Do you see your meetings there? ✅ or ❌

### Test 2: Check Console on Page Load
```
📅 Calendar events loaded: 2
```
Should show number > 0

### Test 3: Check Console When Sending Message
Look for all three logs mentioned above

---

## 🚀 Deployment Timeline

- **Now:** Code is deploying to Vercel
- **2-3 minutes:** Deployment completes
- **Then:** Hard refresh and test with console open

---

**Once you've checked the console logs, let me know what you see!** This will help me identify exactly where the issue is.

