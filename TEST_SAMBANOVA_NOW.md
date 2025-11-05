# 🧪 Test SambaNova Integration - Quick Guide

## ⚡ 3-Minute Test

### Step 1: Start Your App (30 seconds)
```bash
cd apps/sales-curiosity-web
npm run dev
```

### Step 2: Open Dashboard (30 seconds)
1. Go to http://localhost:3000/dashboard
2. **Look above the chat input** - you should see:
   - Dropdown showing "DeepSeek R1 (671B)"
   - Badge saying "via SambaNova Cloud" (orange)

### Step 3: Verify in Console (2 minutes)
1. **Open Developer Tools**: Press `F12` (Windows/Linux) or `Cmd+Option+I` (Mac)
2. Click the **Console** tab
3. **Send a test message**: Type "Hello" and press Send
4. **Check for these logs**:

```
🤖 Sending message to SambaNova Cloud: {model: "DeepSeek-R1-0528"}
🤖 [Chat API] Using SambaNova model: DeepSeek-R1-0528
🚀 [Chat API] Calling SambaNova Cloud with model: DeepSeek-R1-0528
```

✅ **If you see these logs** → SambaNova is working!

## 🎯 What to Look For

### Visual Confirmation
- [ ] Model dropdown visible above chat input
- [ ] "via SambaNova Cloud" badge (orange) visible
- [ ] Info button (ℹ️) next to dropdown

### Console Confirmation
- [ ] 🤖 emoji logs with model name
- [ ] 🚀 emoji when calling API
- [ ] Model ID shown: "DeepSeek-R1-0528" (or your selected model)

### Functional Confirmation
- [ ] Chat messages send successfully
- [ ] AI responds (proves SambaNova API works)
- [ ] Can switch between models
- [ ] Each model works when selected

## 🔄 Test Different Models

1. **Select Llama 3.3 70B** from dropdown
2. Send message: "What model are you?"
3. Check console: Should show `Meta-Llama-3.3-70B-Instruct`
4. Repeat for other models

## 📊 Network Verification (Optional)

1. Open **Network** tab in Developer Tools
2. Send a chat message
3. Find the `/api/chat` request
4. Click it → **Payload** tab
5. Verify `"model": "DeepSeek-R1-0528"` is in the JSON

## ❌ Troubleshooting

### Don't See the Dropdown?
```bash
# Clear cache and restart
rm -rf .next
npm run dev
```

### No Console Logs?
- Make sure Console tab is open
- Check for JavaScript errors (red text)
- Refresh the page and try again

### API Errors?
```bash
# Check your environment variables
echo $SAMBANOVA_API_KEY  # Should show your key
```

If not set:
```bash
echo "SAMBANOVA_API_KEY=your-key" >> .env.local
echo "SAMBANOVA_BASE_URL=https://api.sambanova.ai/v1" >> .env.local
npm run dev
```

## 🎉 Success Criteria

You've successfully tested SambaNova if:

✅ Model dropdown is visible  
✅ Console shows 🤖 emoji logs with model name  
✅ "SambaNova Cloud" badge is visible  
✅ Chat works and AI responds  
✅ Can switch between models  

## 📸 What You Should See

### Above Chat Input:
```
AI Model: [DeepSeek R1 (671B) - Most powerful ▼] [ℹ️]   via [SambaNova Cloud]
_______________________________________________________________
| Type your message...                                [Send] |
```

### In Console:
```
🤖 Sending message to SambaNova Cloud: {model: "DeepSeek-R1-0528"}
🤖 [Chat API] Using SambaNova model: DeepSeek-R1-0528  
🚀 [Chat API] Calling SambaNova Cloud with model: DeepSeek-R1-0528
```

### In Network Tab Payload:
```json
{
  "message": "Hello",
  "model": "DeepSeek-R1-0528",
  "conversationHistory": [],
  "userContext": {...}
}
```

## 🔍 Detailed Verification

### Test Each Model:

1. **DeepSeek R1 (671B)** - Default
   - Select it → Send "Test message 1"
   - Console: `DeepSeek-R1-0528` ✅

2. **Llama 3.3 70B**
   - Select it → Send "Test message 2"
   - Console: `Meta-Llama-3.3-70B-Instruct` ✅

3. **Llama 3.1 405B**
   - Select it → Send "Test message 3"
   - Console: `Meta-Llama-3.1-405B-Instruct` ✅

4. **Llama 3.1 70B**
   - Select it → Send "Test message 4"
   - Console: `Meta-Llama-3.1-70B-Instruct` ✅

5. **Llama 3.1 8B**
   - Select it → Send "Test message 5"
   - Console: `Meta-Llama-3.1-8B-Instruct` ✅

## 💡 Pro Tips

1. **Keep Console Open**: You'll see real-time confirmation of which model is being called
2. **Test Model Switching**: Change models mid-conversation to compare responses
3. **Check Info Panel**: Click the ℹ️ button to see full model details
4. **Monitor Network**: Watch the actual API calls in the Network tab

## 🆘 Still Having Issues?

1. **Check Environment Variables**:
   ```bash
   cat .env.local | grep SAMBA
   ```
   
   Should show:
   ```
   SAMBANOVA_API_KEY=your-key-here
   SAMBANOVA_BASE_URL=https://api.sambanova.ai/v1
   ```

2. **Check API Key is Valid**:
   - Go to https://cloud.sambanova.ai
   - Log in
   - Check your API keys are active

3. **Check Logs**:
   ```bash
   # In your terminal where npm run dev is running
   # Look for any errors related to SambaNova
   ```

4. **Read Full Docs**:
   - `SAMBANOVA_MODEL_SELECTOR_ADDED.md` - Detailed feature doc
   - `SAMBANOVA_SETUP.md` - Complete setup guide
   - `SAMBANOVA_ENV_TEMPLATE.md` - Environment setup

## ✅ Final Checklist

Before you're done testing:

- [ ] Opened http://localhost:3000/dashboard
- [ ] Saw model dropdown above chat input
- [ ] Saw "via SambaNova Cloud" badge
- [ ] Opened Developer Console (F12)
- [ ] Sent a test message
- [ ] Saw 🤖 emoji logs in console
- [ ] Verified model name in logs matches dropdown
- [ ] Tried switching models
- [ ] Verified each model works
- [ ] Checked Network tab (optional)
- [ ] Clicked info button to see model details

---

**If all checks pass** → 🎉 **SambaNova is working perfectly!**

**Questions?** Check the other documentation files:
- `SAMBANOVA_SETUP.md`
- `SAMBANOVA_ENV_TEMPLATE.md`  
- `SAMBANOVA_MODEL_SELECTOR_ADDED.md`
- `MIGRATION_TO_SAMBANOVA.md`

