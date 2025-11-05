# 🔄 Chrome Extension - Reload Instructions

**Updated**: November 5, 2025  
**Changes**: Collapsible thinking display added

## ✅ What Was Fixed

1. **Thinking tags now hidden** - No more `<think>` text visible
2. **Collapsible reasoning** - Click "View Thinking Process" to see AI's reasoning
3. **Better text formatting** - Clean headers, bullets, and spacing

---

## 🔄 How to Reload the Extension

### Quick Reload (Do This First)

1. **Open Chrome Extensions**:
   ```
   chrome://extensions/
   ```

2. **Find "Sales Curiosity"** in the list

3. **Click the 🔄 reload icon** (circular arrow button)

4. **Done!** ✅

### If Quick Reload Doesn't Work

**Option 1: Remove and Re-add**
```
1. Click "Remove" button on Sales Curiosity
2. Click "Load unpacked"
3. Navigate to:
   /Users/matthewbravo/Downloads/curiosityengine-3/apps/sales-curiosity-extension/dist
4. Click "Select"
```

**Option 2: Hard Refresh**
```
1. Close ALL LinkedIn tabs
2. Go to chrome://extensions/
3. Toggle "Sales Curiosity" OFF then ON
4. Open fresh LinkedIn profile
```

---

## 🧪 How to Test

### Step 1: Reload Extension
```
chrome://extensions/ → Find Sales Curiosity → Click 🔄
```

### Step 2: Test on LinkedIn
```
1. Go to any LinkedIn profile
2. Click the Sales Curiosity extension icon  
3. Click "Analyze Profile"
4. Wait for analysis...
```

### Step 3: Verify Results
```
✅ NO <think> tags visible in main response
✅ "View Thinking Process" button appears (blue)
✅ Click button → See AI reasoning in blue panel
✅ Click again → Hide reasoning
✅ Clean, formatted final answer
```

---

## 📸 What You Should See

### Before (Old - with <think> tags):
```
┌─────────────────────────────────────┐
│ <think>                             │
│ We are given a LinkedIn profile...  │
│                                     │
│ Explicit information from profile:  │
│ - Name: Meredith Dunnington        │
└─────────────────────────────────────┘
```

### After (New - clean with collapsible thinking):
```
┌─────────────────────────────────────┐
│ 💡 View Thinking Process          ▶ │  ← Collapsible!
├─────────────────────────────────────┤
│ ### Executive Summary               │
│ Meredith Dunnington is a Sales &   │
│ Revenue Operations Analyst...       │
│                                     │
│ **Key Insights**                    │
│ • Strong Salesforce CRM expertise   │
│ • Based in Atlanta, Georgia         │
└─────────────────────────────────────┘
```

### When Expanded:
```
┌─────────────────────────────────────┐
│ 💡 Hide Thinking Process          ▼ │
├─────────────────────────────────────┤
│ ┌─ AI Reasoning ──────────────────┐ │
│ │ We are given a LinkedIn profile │ │
│ │ for Meredith Dunnington...      │ │
│ │ [Full reasoning here]           │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ ### Executive Summary               │
│ Meredith Dunnington is a...        │
└─────────────────────────────────────┘
```

---

## 🎯 Features Working Now

| Feature | Status |
|---------|--------|
| Thinking tags stripped | ✅ Yes |
| Collapsible thinking panel | ✅ Yes |
| Blue "View Thinking" button | ✅ Yes |
| Lightbulb icon | ✅ Yes |
| Arrow rotation animation | ✅ Yes |
| Clean formatted output | ✅ Yes |
| Markdown headers | ✅ Yes |
| Bold text support | ✅ Yes |
| Bullet points | ✅ Yes |

---

## 🐛 Troubleshooting

### Still Seeing `<think>` Tags?

**Try this:**
```
1. Go to chrome://extensions/
2. Click "Remove" on Sales Curiosity
3. Close ALL Chrome windows
4. Reopen Chrome
5. Go to chrome://extensions/
6. Enable Developer mode (top right toggle)
7. Click "Load unpacked"
8. Select: curiosityengine-3/apps/sales-curiosity-extension/dist
9. Test on fresh LinkedIn profile
```

### "View Thinking Process" Button Not Showing?

**This is normal if:**
- The AI didn't use reasoning for that response
- You're using a non-reasoning model (Llama models)
- The response was simple and didn't need thinking

**Only DeepSeek-R1** consistently shows thinking. Other models may not.

### Extension Won't Load?

```
1. Check: Developer mode is ON
2. Check: Path is correct (/dist folder, not /src)
3. Check: No errors in extension console
4. Try: Rebuild the extension
   cd apps/sales-curiosity-extension
   npm run build
```

---

## 💡 Pro Tips

1. **Use DeepSeek-R1 to see thinking** - It's the primary reasoning model
2. **Click the lightbulb** to understand how AI analyzed the profile
3. **Export includes thinking** - When you export to PDF/text
4. **Thinking is searchable** - Great for understanding AI decisions

---

## 🔄 Build Info

- **Build**: ✅ Complete
- **Output**: `dist/popup.js` (2.5mb)
- **Source**: `src/popup.tsx`
- **Commit**: `789112c` (and latest fix)

---

## ✅ Verification Checklist

After reloading, verify:

- [ ] Extension icon visible in Chrome toolbar
- [ ] No errors in chrome://extensions/
- [ ] Can open extension popup on LinkedIn
- [ ] "Analyze Profile" button works
- [ ] NO `<think>` tags in response
- [ ] "View Thinking Process" button appears (for DeepSeek)
- [ ] Can expand/collapse thinking panel
- [ ] Final answer is clean and formatted
- [ ] Headers in orange
- [ ] Bullet points with •
- [ ] Bold text works

---

**All good?** ✅ You're ready to use the improved extension!

**Still having issues?** Try the full remove/re-add method above.

