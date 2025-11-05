# SambaNova Cloud DeepSeek Integration Setup

This application has been migrated from OpenAI to **SambaNova Cloud** using **DeepSeek models** for AI-powered sales intelligence.

## Why SambaNova Cloud?

- **DeepSeek-R1-0528**: A powerful 671B-parameter Mixture-of-Experts model
- **OpenAI-Compatible API**: Minimal code changes required
- **Cost-effective**: Competitive pricing for high-quality AI inference
- **High Performance**: Optimized for fast inference speeds

## Quick Setup

### 1. Get Your SambaNova API Key

1. Visit [SambaNova API Keys Page](https://cloud.sambanova.ai/apis)
2. Sign up or log in to your SambaNova account
3. Generate a new API key
4. **Important**: Save it securely - you won't be able to view it again!
5. You can generate up to 25 API keys

### 2. Configure Environment Variables

Add the following environment variables to your environment:

#### For Local Development (`.env.local`)

```bash
# SambaNova Cloud Configuration
SAMBANOVA_API_KEY=your-api-key-here
SAMBANOVA_BASE_URL=https://api.sambanova.ai/v1
```

#### For Vercel/Production Deployment

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add the following variables:
   - `SAMBANOVA_API_KEY` = `your-api-key-here`
   - `SAMBANOVA_BASE_URL` = `https://api.sambanova.ai/v1`

### 3. Remove Old OpenAI Configuration (Optional)

You can now remove these old environment variables:
- ~~`OPENAI_API_KEY`~~ (no longer needed)

## Model Information

The application now uses **DeepSeek-R1-0528** across all AI features:

- **Chat Interface**: Real-time AI sales assistant with tool calling
- **LinkedIn Profile Analysis**: Deep analysis of prospect profiles
- **Email Drafting**: Personalized sales email generation
- **Chat Naming**: Auto-generated conversation titles

## API Compatibility

SambaNova Cloud is fully compatible with OpenAI's API, so we continue using the `openai` npm package with:
- Custom `baseURL`: `https://api.sambanova.ai/v1`
- Custom `apiKey`: Your SambaNova API key

## Testing Your Setup

### Test Endpoint

Access the test endpoint to verify your configuration:

```bash
# Local
curl http://localhost:3000/api/test-openai

# Production
curl https://your-app.vercel.app/api/test-openai
```

Expected response:
```json
{
  "success": true,
  "message": "SambaNova API is working!",
  "response": "Hello, API is working!",
  "model": "DeepSeek-R1-0528",
  "usage": {...}
}
```

## Features Powered by DeepSeek

### 1. AI Sales Chat
- **Location**: Main dashboard chat interface
- **Model**: DeepSeek-R1-0528
- **Features**:
  - Real-time streaming responses
  - Tool calling for Salesforce and Outlook integration
  - Context-aware using sales materials and user profile
  - Calendar integration for meeting insights

### 2. LinkedIn Prospect Analysis
- **Location**: Chrome extension → "Analyze" button
- **Model**: DeepSeek-R1-0528
- **Features**:
  - Deep profile analysis
  - Sales angle recommendations
  - Personalized conversation starters
  - CRM matching (if Salesforce connected)

### 3. Email Drafting
- **Location**: Chrome extension → "Draft Email" button
- **Model**: DeepSeek-R1-0528
- **Features**:
  - Context-aware personalization
  - Leverages your sales materials
  - Adjusts tone based on CRM history
  - Includes compelling subject lines

### 4. Auto Chat Naming
- **Location**: Automatic when creating new chats
- **Model**: DeepSeek-R1-0528
- **Features**: Generates descriptive titles for conversations

## Troubleshooting

### API Key Not Set

**Error**: `SAMBANOVA_API_KEY is not set`

**Solution**: 
1. Check your `.env.local` file (local) or Vercel environment variables (production)
2. Ensure the key is named exactly `SAMBANOVA_API_KEY`
3. Restart your development server: `npm run dev`

### Authentication Errors

**Error**: `401 Unauthorized`

**Solution**:
1. Verify your API key is correct
2. Check if the key has been revoked in SambaNova dashboard
3. Generate a new API key if needed

### Rate Limiting

**Error**: `429 Too Many Requests`

**Solution**:
1. Check your [SambaNova rate limits](https://docs.sambanova.ai/docs/en/models/rate-limits)
2. Implement exponential backoff in your requests
3. Consider upgrading your SambaNova plan

### Model Not Found

**Error**: `404 Model not found`

**Solution**:
1. Verify the model name is exactly `DeepSeek-R1-0528`
2. Check [SambaNova models page](https://docs.sambanova.ai/docs/en/models/sambacloud-models) for available models
3. Model availability may vary by region

## Code Changes Summary

### Files Modified

1. **`src/lib/openai.ts`**
   - Updated to use SambaNova base URL
   - Changed environment variable from `OPENAI_API_KEY` to `SAMBANOVA_API_KEY`

2. **`src/app/api/chat/route.ts`**
   - Model changed from `gpt-4o` to `DeepSeek-R1-0528`

3. **`src/app/api/test-openai/route.ts`**
   - Model changed from `gpt-4o-mini` to `DeepSeek-R1-0528`
   - Updated console logs to reference SambaNova

4. **`src/app/api/prospects/route.ts`**
   - Converted from reasoning API (`openai.responses.create`) to standard chat API
   - Model changed to `DeepSeek-R1-0528`

5. **`src/app/api/chats/[chatId]/rename/route.ts`**
   - Model changed from `gpt-4o-mini` to `DeepSeek-R1-0528`

## Resources

- [SambaNova Cloud Dashboard](https://cloud.sambanova.ai/)
- [SambaNova Documentation](https://docs.sambanova.ai/)
- [DeepSeek-R1-0528 Model Info](https://sambanova.ai/blog/deepseek-r1-0528-now-live)
- [API Reference](https://docs.sambanova.ai/docs/en/api-reference)
- [Rate Limits](https://docs.sambanova.ai/docs/en/models/rate-limits)

## Migration Notes

### What Changed?
- **API Provider**: OpenAI → SambaNova Cloud
- **Model**: GPT-4o/GPT-4o-mini → DeepSeek-R1-0528
- **Environment Variables**: `OPENAI_API_KEY` → `SAMBANOVA_API_KEY`

### What Stayed the Same?
- OpenAI SDK (still using `openai` npm package)
- API structure (OpenAI-compatible)
- All features and functionality
- Tool calling and streaming support

### Performance Comparison
- DeepSeek-R1-0528 offers comparable quality to GPT-4o
- Potentially faster inference times
- More cost-effective at scale

## Support

For issues or questions:
1. Check the [SambaNova Documentation](https://docs.sambanova.ai/)
2. Join the [SambaNova Community](https://community.sambanova.ai/)
3. Contact SambaNova support for API-related issues

## Next Steps

1. ✅ Get your SambaNova API key
2. ✅ Add environment variables
3. ✅ Test the API endpoint
4. ✅ Deploy to production
5. 🎉 Enjoy faster, more cost-effective AI!

---

**Last Updated**: November 5, 2025
**DeepSeek Model Version**: R1-0528
**SambaNova API Version**: v1

