# 🚀 Quick Start: SambaNova Cloud Setup

**Migration Complete!** Your app now uses SambaNova Cloud with DeepSeek models instead of OpenAI.

## ⚡ 3-Minute Setup

### Step 1: Get API Key (1 min)
1. Go to **https://cloud.sambanova.ai/apis**
2. Sign up/login
3. Click **"Create API Key"**
4. Copy your key (save it somewhere safe!)

### Step 2: Add to Environment (1 min)

**Local Development:**
```bash
# Create/edit .env.local in your project root
cd apps/sales-curiosity-web
echo "SAMBANOVA_API_KEY=your-key-here" >> .env.local
echo "SAMBANOVA_BASE_URL=https://api.sambanova.ai/v1" >> .env.local
```

**Production (Vercel):**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - `SAMBANOVA_API_KEY` = `your-key-here`
   - `SAMBANOVA_BASE_URL` = `https://api.sambanova.ai/v1`

### Step 3: Test It (1 min)

```bash
# Restart dev server
npm run dev

# Test the API
curl http://localhost:3000/api/test-openai
```

Expected response:
```json
{
  "success": true,
  "message": "SambaNova API is working!",
  "model": "DeepSeek-R1-0528"
}
```

## ✅ You're Done!

Your app now uses:
- **Model**: DeepSeek-R1-0528 (671B parameters)
- **Provider**: SambaNova Cloud
- **All Features**: ✅ Working (chat, email drafting, prospect analysis, etc.)

## 🎯 What Changed?

### Environment Variables
- ❌ ~~`OPENAI_API_KEY`~~ (remove this)
- ✅ `SAMBANOVA_API_KEY` (add this)
- ✅ `SAMBANOVA_BASE_URL` (add this)

### Models
- Chat: `gpt-4o` → `DeepSeek-R1-0528`
- Analysis: `gpt-5-mini` → `DeepSeek-R1-0528`
- Quick tasks: `gpt-4o-mini` → `DeepSeek-R1-0528`

### Code
- 5 files updated
- Same API structure
- Same features
- Same user experience

## 📚 Need More Help?

- **Full Setup Guide**: See `SAMBANOVA_SETUP.md`
- **Environment Template**: See `SAMBANOVA_ENV_TEMPLATE.md`
- **Complete Migration Details**: See `MIGRATION_TO_SAMBANOVA.md`
- **SambaNova Docs**: https://docs.sambanova.ai/

## 🐛 Troubleshooting

**"API key not set" error?**
```bash
# Check your .env.local exists
ls -la apps/sales-curiosity-web/.env.local

# Restart your dev server
npm run dev
```

**"401 Unauthorized" error?**
- Double-check your API key is correct
- Make sure you copied the entire key
- Try generating a new key

**Still not working?**
1. Check `SAMBANOVA_SETUP.md` for detailed troubleshooting
2. Verify at https://cloud.sambanova.ai that your API key is active
3. Check SambaNova status page

## 🎉 Benefits

- ✅ Cost-effective alternative to OpenAI
- ✅ Powerful 671B parameter model
- ✅ Same code structure (OpenAI-compatible)
- ✅ Easy to switch back if needed

---

**Ready to Deploy?** Just add the environment variables to Vercel and redeploy!

**Questions?** Check the detailed guides in:
- `SAMBANOVA_SETUP.md`
- `SAMBANOVA_ENV_TEMPLATE.md`
- `MIGRATION_TO_SAMBANOVA.md`

