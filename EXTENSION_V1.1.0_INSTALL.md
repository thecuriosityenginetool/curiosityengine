# 📦 Sales Curiosity Extension v1.1.0 - Installation Guide

**Version**: 1.1.0  
**Release Date**: November 5, 2025  
**File**: `sales-curiosity-extension-v1.1.0.zip`  
**Location**: `~/Downloads/sales-curiosity-extension-v1.1.0.zip`

## ✨ What's New in v1.1.0

### 🧠 Collapsible Thinking Display
- DeepSeek-R1 reasoning shown in expandable blue panel
- Hidden by default for clean UI
- Click "View Thinking Process" to see AI's chain of thought
- Matches dashboard experience

### 🎨 Improved Formatting
- Markdown headers (###, ##, #) properly rendered
- Inline bold text (**text**) support
- Better bullet points and spacing
- Cleaner text presentation
- Stripped `<think>` tags from display

### 🔧 Bug Fixes
- Fixed Salesforce status display
- Better parsing of AI responses
- Improved error handling
- Debug logging for troubleshooting

---

## 🚀 Installation Instructions

### Step 1: Unzip the Extension

1. Go to your **Downloads** folder
2. Find: `sales-curiosity-extension-v1.1.0.zip`
3. **Double-click** to unzip it
4. You'll get a folder called `dist`

### Step 2: Remove Old Version (Critical!)

1. Open Chrome
2. Go to: `chrome://extensions/`
3. Find ANY old "Sales Curiosity" extensions
4. Click **"Remove"** on each one
5. Confirm removal

### Step 3: Load New Extension

1. Still on `chrome://extensions/`
2. Turn ON **"Developer mode"** (toggle in top-right corner)
3. Click **"Load unpacked"** button
4. Navigate to the **`dist`** folder you just unzipped
5. Select the `dist` folder
6. Click **"Select"**

### Step 4: Verify Installation

You should see:
- ✅ Extension name: "Sales Curiosity"
- ✅ Version: **1.1.0** (new!)
- ✅ Status: Enabled (blue toggle)
- ✅ No errors shown

---

## 🧪 Test the New Features

### Test 1: Basic Analysis

1. Go to any LinkedIn profile
2. Click the **Sales Curiosity** extension icon
3. Click **"🔍 Analyze Profile"**
4. Wait for analysis...
5. **Check**: NO `<think>` tags in main text! ✅
6. **Look for**: Blue "💡 View Thinking Process" button

### Test 2: Thinking Display

1. Click **"View Thinking Process"** button
2. Blue panel expands showing AI's reasoning
3. Click again to collapse
4. Main response stays clean ✅

### Test 3: Email Drafting

1. Click **"✉️ Draft Email"** button
2. Add optional context
3. Wait for email draft...
4. **Check**: Clean, formatted email without thinking tags ✅

---

## 🔍 Debug Console (Optional)

To see what's happening under the hood:

### Open Extension Console:

1. Go to: `chrome://extensions/`
2. Find: "Sales Curiosity v1.1.0"
3. Click: **"Inspect views: service worker"**
4. This opens the console

### What You'll See:

When you analyze a profile, look for:
```
🧠 Raw analysis received: <think>...
💡 Thinking tags detected, parsing...
✅ Parsed - Thinking: [...] Final: [...]
✅ Response set: [clean content]
```

These logs confirm the extension is properly parsing thinking tags!

---

## ✅ Success Checklist

After installation, verify:

- [ ] Extension shows version **1.1.0** at chrome://extensions/
- [ ] Extension icon appears in Chrome toolbar
- [ ] Can open extension popup on LinkedIn
- [ ] "Analyze Profile" button works
- [ ] **NO `<think>` tags** visible in response
- [ ] "View Thinking Process" button appears (blue)
- [ ] Can expand/collapse thinking panel
- [ ] Final answer is clean and well-formatted
- [ ] Headers in orange color
- [ ] Bullet points with • symbol
- [ ] Bold text renders properly

---

## 🎯 What's Different from v1.0.0?

| Feature | v1.0.0 | v1.1.0 |
|---------|--------|--------|
| Thinking tags visible | ❌ Yes | ✅ No |
| Thinking display | ❌ None | ✅ Collapsible |
| Markdown headers | ⚠️ Basic | ✅ Full support |
| Inline bold | ⚠️ Partial | ✅ Full support |
| Formatting | ⚠️ Basic | ✅ Enhanced |
| Debug logging | ❌ No | ✅ Yes |

---

## 🚨 Troubleshooting

### Issue 1: Still See Old Version

**Problem**: Extension shows v1.0.0  
**Solution**:
```
1. Remove extension completely
2. Close ALL Chrome windows
3. Reopen Chrome
4. Load extension again from NEW dist folder
```

### Issue 2: `<think>` Tags Still Showing

**Problem**: Thinking tags visible in response  
**Solution**:
```
1. Open extension console (chrome://extensions/ → Inspect views)
2. Analyze a profile
3. Check console logs - do you see:
   🧠 Raw analysis received: ...
   💡 Thinking tags detected...
   
If NO logs appear → Extension didn't rebuild properly
If logs appear but tags still show → Send me the full console output
```

### Issue 3: Extension Won't Load

**Problem**: Error when loading  
**Solution**:
```
1. Make sure you selected the "dist" folder (not src)
2. Check Developer mode is ON
3. Try: Refresh extension list
4. Check for errors in the extension card
```

---

## 📂 File Structure (What You Should See)

When you select the `dist` folder, it should contain:

```
dist/
├── manifest.json (v1.1.0)
├── popup.html
├── popup.js (2.5MB - includes all logic)
├── content.js
├── background.js
├── auth-bridge.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🎉 After Installation

**Your extension will now:**

1. ✅ Hide thinking tags by default
2. ✅ Show "View Thinking Process" button for DeepSeek responses
3. ✅ Display clean, well-formatted analysis
4. ✅ Support markdown headers and bold text
5. ✅ Work seamlessly with SambaNova Cloud
6. ✅ Log debug info for troubleshooting

---

## 📖 Related Documentation

- `EXTENSION_RELOAD_GUIDE.md` - General reload instructions
- `MODEL_SWITCHING_GUIDE.md` - Model switching in dashboard
- `SAMBANOVA_SETUP.md` - SambaNova configuration

---

## 📍 Zip File Location

```
~/Downloads/sales-curiosity-extension-v1.1.0.zip
```

**File size**: ~600KB (compressed)  
**Unzipped size**: ~8MB (includes source maps)

---

## ⚡ Quick Start

```bash
# If you want to do it from terminal:
cd ~/Downloads
unzip sales-curiosity-extension-v1.1.0.zip
# Then load the dist folder in Chrome
```

---

**Ready to install!** 🚀

1. Unzip the file in Downloads
2. Remove old extension
3. Load the dist folder
4. Test on LinkedIn
5. Enjoy clean, formatted analysis!

