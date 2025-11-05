import OpenAI from 'openai';

// SambaNova Cloud API configuration
const apiKey = process.env.SAMBANOVA_API_KEY;
const baseURL = process.env.SAMBANOVA_BASE_URL || 'https://api.sambanova.ai/v1';

if (!apiKey) {
  console.warn('SAMBANOVA_API_KEY is not set. Please add it to your environment variables.');
}

// Initialize OpenAI client with SambaNova configuration
// SambaNova is OpenAI-compatible, so we can use the OpenAI SDK
export const openai = new OpenAI({ 
  apiKey: apiKey || '',
  baseURL: baseURL
});


