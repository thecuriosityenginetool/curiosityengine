# Chrome Extension - Complete Reload Instructions

## The Problem
Chrome aggressively caches extension icons and content scripts. A simple reload button click won't update:
- Extension icons in the toolbar
- Extension icons in the extensions page
- Content scripts on already-open pages

## ✅ Complete Solution (Follow ALL Steps)

### Step 1: Remove Old Extension Completely
1. Go to `chrome://extensions/`
2. Find "Sales Curiosity"
3. Click **"Remove"** button (not just disable - REMOVE it)
4. Confirm removal

### Step 2: Close ALL LinkedIn Tabs
1. Close every LinkedIn tab you have open
2. This ensures the old content script is completely gone
3. Don't skip this step!

### Step 3: Clear Extension Cache (Important!)
1. In Chrome, press `Cmd + Shift + Delete` (Mac) or `Ctrl + Shift + Delete` (Windows)
2. Select "Cached images and files"
3. Time range: "Last hour" is sufficient
4. Click "Clear data"

### Step 4: Load Fresh Extension
1. Go back to `chrome://extensions/`
2. Make sure "Developer mode" is ON (toggle in top-right)
3. Click **"Load unpacked"**
4. Navigate to and select: `/Users/matthewbravo/Downloads/curiosityengine-2/apps/sales-curiosity-extension/dist`
5. Click "Select"

### Step 5: Verify Icon Updated
- Look at your Chrome toolbar
- You should see the NEW orange flame icon (not the old black box)
- If you still see the old icon, repeat Step 3 (cache clearing)

### Step 6: Test on Fresh LinkedIn Page
1. Open a NEW LinkedIn profile page
2. Navigate to any profile (e.g., https://linkedin.com/in/someone)
3. Let the page fully load and scroll down a bit
4. Click the Sales Curiosity extension icon
5. Click "Analyze Profile"
6. Should work without errors!

## 🔍 Troubleshooting

### Still seeing "Failed to extract profile data"?
1. **Refresh the LinkedIn page** after loading the extension
2. The content script only injects when the page loads
3. If you had the page open before loading the extension, it won't work

### Still seeing old icon?
1. Completely quit Chrome (not just close windows)
2. Reopen Chrome
3. The icon cache should now be cleared

### Extension not appearing after loading?
1. Check the console in `chrome://extensions/` for errors
2. Make sure you selected the `/dist` folder, not the `/src` folder
3. Try reloading the extension page

## 📝 Quick Reference
**Extension Location:** `/Users/matthewbravo/Downloads/curiosityengine-2/apps/sales-curiosity-extension/dist`

**Extension ID will change** each time you remove/reload an unpacked extension, which is normal.

---
**After following these steps, your extension should have:**
- ✅ New orange flame icon
- ✅ Working LinkedIn profile extraction
- ✅ All latest fixes and improvements

