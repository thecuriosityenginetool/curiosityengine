# 🔄 Model Switching Guide - Maintaining Chat History

**Feature**: Switch AI models mid-conversation without losing chat history  
**Status**: ✅ Already Working!

## ✅ How It Works

When you switch models in the chat interface, your conversation history is **automatically maintained**. You can:

- Switch from DeepSeek-R1 to Llama 3.3 mid-conversation ✅
- Switch back and forth between models ✅
- Compare how different models respond to the same context ✅
- All messages stay in the chat ✅

---

## 🎯 How to Use It

### Step 1: Start a Conversation

```
1. Go to Dashboard → Chat
2. Send a message with any model (e.g., DeepSeek-R1)
3. Get a response
```

### Step 2: Switch Models

```
4. Use the dropdown: "AI Model: [DeepSeek R1 ▼]"
5. Select a different model (e.g., "Llama 3.3 70B")
6. Send another message
```

### Step 3: Continue Conversation

```
7. The AI responds with the NEW model
8. But it remembers ALL previous messages
9. Context is preserved!
```

---

## 📊 Example Conversation

```
YOU: "Analyze the sales strategy for enterprise clients"
(Using DeepSeek-R1)

AI: [Detailed response with reasoning...]

--- You switch to Llama 3.3 70B ---

YOU: "Now create an email template based on that strategy"
(Using Llama 3.3 70B)

AI: [Email template that references the previous analysis]
         ↑ Still remembers the conversation!
```

---

## 🔍 Technical Details

### What Gets Passed to the API:

```typescript
{
  message: "Your new message",
  conversationHistory: [...all previous messages...],  // ✅ Preserved!
  model: "Meta-Llama-3.3-70B-Instruct",  // ✅ New model
  userContext: {...},
  calendarEvents: [...]
}
```

### What Happens:

1. **Model dropdown changes** → `selectedModel` state updates
2. **You send a message** → API receives:
   - All previous messages (history)
   - Your new message
   - The newly selected model
3. **API responds** → Uses new model but with full context
4. **Chat continues** → Seamlessly!

---

## 💡 Use Cases

### Use Case 1: Speed vs Complexity
```
- Start with DeepSeek-R1 for complex analysis
- Switch to Llama 3.1 8B for quick follow-ups
- Saves time and costs on simple questions
```

### Use Case 2: Compare Models
```
- Ask same question to different models
- See which gives better answers
- Learn which model works best for different tasks
```

### Use Case 3: Optimize Costs
```
- Use Llama 3.1 405B for important strategy
- Switch to Llama 3.1 70B for general questions  
- Switch to Llama 3.1 8B for simple tasks
```

---

## ⚠️ When Chat History Clears

The **only way** chat history is cleared:

1. **Click "+ New Chat" button** (intentional)
2. **Load a different chat** from history
3. **Refresh the page** (browser limitation)

**Model switching does NOT clear history** ✅

---

## 🎯 Best Practices

### Recommended Model Switching Strategy:

| Task Type | Start With | Switch To |
|-----------|-----------|-----------|
| **Complex Analysis** | DeepSeek-R1 | Llama 3.3 70B (for follow-ups) |
| **Email Drafting** | Llama 3.3 70B | Llama 3.1 8B (for tweaks) |
| **Quick Questions** | Llama 3.1 70B | Same (no need to switch) |
| **Brainstorming** | DeepSeek-R1 | Llama 3.1 405B (detailed) |
| **Simple Tasks** | Llama 3.1 8B | Same |

### Tips:

1. **Start heavy, go light**: Begin with powerful model, switch to faster ones
2. **Watch the badge**: "via SambaNova Cloud" confirms which API is being used
3. **Check console**: See exact model in logs (F12 → Console)
4. **Compare responses**: Try same question with different models

---

## 🧪 Test It Now

**Quick Test:**

1. Open Dashboard → Chat
2. Send: "What is sales velocity?"
3. Get response (using DeepSeek-R1)
4. Switch dropdown to "Llama 3.3 70B"
5. Send: "How does it relate to our previous discussion?"
6. Check: AI should reference the sales velocity explanation ✅

---

## 🔍 How to Verify It's Working

### Console Logs:
```
Open Developer Tools (F12) and look for:

Message 1:
🤖 Sending message to SambaNova Cloud: {model: "DeepSeek-R1-0528"}

[You switch models]

Message 2:
🤖 Sending message to SambaNova Cloud: {model: "Meta-Llama-3.3-70B-Instruct"}

Both messages in same conversation!
```

### Visual Confirmation:
```
- Chat messages stay visible
- Model dropdown shows new model
- Response uses new model
- Context is maintained
```

---

## 📋 What's Preserved When Switching

| Item | Preserved? |
|------|-----------|
| Chat messages | ✅ Yes |
| Conversation context | ✅ Yes |
| User context | ✅ Yes |
| Sales materials | ✅ Yes |
| Calendar events | ✅ Yes |
| Salesforce connection | ✅ Yes |
| Outlook connection | ✅ Yes |
| Current chat ID | ✅ Yes |

---

## 🚀 Advanced: Model Selection by Task

**Create different chats for different model strategies:**

### Strategy 1: "Analysis Chat" (DeepSeek-R1)
- Deep prospect analysis
- Complex sales strategies
- Market research

### Strategy 2: "Quick Tasks Chat" (Llama 3.1 8B)
- Simple email edits
- Quick CRM updates
- Calendar checks

### Strategy 3: "Mixed Conversation" (Switch as needed)
- Start with DeepSeek-R1 for strategy
- Switch to Llama 3.3 70B for execution
- Switch to Llama 3.1 8B for simple edits
- **All in one conversation!** ✅

---

## ✨ Benefits

1. **Flexibility**: Choose the right tool for each step
2. **Context Maintained**: AI remembers everything
3. **Cost Optimization**: Use expensive models only when needed
4. **Speed**: Switch to fast models for simple questions
5. **Experimentation**: Compare model responses easily

---

## 📖 Related Documentation

- `SAMBANOVA_MODEL_SELECTOR_ADDED.md` - Model selector feature
- `TEST_SAMBANOVA_NOW.md` - Testing SambaNova integration
- `EXTENSION_RELOAD_GUIDE.md` - This guide

---

**Model switching is working!** Just select a different model and keep chatting. 🎉

