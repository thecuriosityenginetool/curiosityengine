/**
 * Smart Model Router for LangGraph Agent
 * 
 * Routes requests to the optimal model based on user selection and request type.
 * Priority:
 * 1. User manually selected model → Use that model (respect user choice)
 * 2. "Auto" mode → Smart routing based on request type
 */

// Available models (must match SambaNova Cloud model IDs exactly)
// Simplified to use one model that supports tool use
export const MODELS = {
  AUTO: 'auto', // Special value for auto-routing
  LLAMA_3_3: 'Meta-Llama-3.3-70B-Instruct', // Single model that supports tool use
} as const;

// Tool-based keywords that indicate need for function calling
const TOOL_KEYWORDS = [
  // CRM & Data access
  'check', 'search', 'find', 'look', 'get', 'fetch',
  'calendar', 'email', 'draft', 'send', 'schedule', 'create',
  'salesforce', 'crm', 'contact', 'lead', 'task', 'note',
  'outlook', 'gmail', 'meeting', 'event', 'appointment',
  // Web search indicators
  'news', 'latest', 'recent', 'current', 'today', 'this week',
  'research', 'information about', 'tell me about', 'what is',
  'who is', 'where is', 'when did', 'updates', 'developments',
  'browse', 'website', 'url', 'link', 'article'
];

// Reasoning keywords that indicate pure analysis/writing
const REASONING_KEYWORDS = [
  'analyze', 'explain', 'why', 'how', 'what do you think',
  'strategy', 'approach', 'advice', 'recommend', 'suggest',
  'write', 'compose', 'essay', 'article', 'summary',
  'compare', 'evaluate', 'assess', 'review'
];

/**
 * Detect if a message needs tool-based processing (function calling)
 * Returns true if message is tool-heavy, false if reasoning-heavy
 */
export function isToolBasedRequest(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  // Short greetings/simple messages don't need tools
  const simpleGreetings = ['hi', 'hello', 'hey', 'thanks', 'thank you', 'ok', 'okay', 'yes', 'no'];
  if (simpleGreetings.some(greeting => lowerMessage.trim() === greeting)) {
    console.log('🗣️ [Model Router] Simple greeting detected - no tools needed');
    return false;
  }

  // Count tool-related keywords
  const toolScore = TOOL_KEYWORDS.reduce((score, keyword) => {
    return score + (lowerMessage.includes(keyword) ? 1 : 0);
  }, 0);

  // Count reasoning-related keywords
  const reasoningScore = REASONING_KEYWORDS.reduce((score, keyword) => {
    return score + (lowerMessage.includes(keyword) ? 1 : 0);
  }, 0);

  // If tool score is higher, it's tool-based
  // If reasoning score is higher, it's reasoning-based
  // If both are 0, default to REASONING (DeepSeek for general chat)
  if (toolScore === 0 && reasoningScore === 0) {
    console.log('💭 [Model Router] No clear signal - defaulting to reasoning mode');
    return false; // Use DeepSeek for general conversation
  }

  const isToolBased = toolScore > reasoningScore;
  console.log('📊 [Model Router] Scores - Tool:', toolScore, 'Reasoning:', reasoningScore, '→', isToolBased ? 'TOOL' : 'REASONING');
  return isToolBased;
}

/**
 * Select the optimal model based on user preference and request type
 * Simplified to always use one model that supports tool use
 * 
 * @param userMessage - The user's input message
 * @param userSelectedModel - The model the user selected (or 'auto')
 * @returns The model ID to use
 */
export function selectModel(
  userMessage: string,
  userSelectedModel: string | null
): string {
  // Always use Meta-Llama-3.3-70B-Instruct which supports tool use
  // This simplifies the workflow and avoids model routing issues
  const selectedModel = MODELS.LLAMA_3_3;
  console.log('🎯 [Model Router] Using simplified model:', selectedModel, '(user selected:', userSelectedModel, ')');
  return selectedModel;
}

/**
 * Get fallback model when primary model fails or times out
 * Simplified - no fallback since we only use one model
 * 
 * @param currentModel - The model that failed/timed out
 * @param userSelectedModel - User's manual selection (if any)
 * @returns Fallback model to try
 */
export function getFallbackModel(
  currentModel: string,
  userSelectedModel: string | null
): string | null {
  // No fallback - using single model approach
  console.log('❌ [Model Router] No fallback available (using single model)');
  return null;
}

/**
 * Model configurations for UI display
 * Simplified to show only the model we actually use
 */
export const MODEL_OPTIONS = [
  {
    id: MODELS.AUTO,
    name: 'Auto (Recommended)',
    description: 'Uses Meta-Llama 3.3 (70B) - Best for tool use',
    icon: '🤖'
  },
  {
    id: MODELS.LLAMA_3_3,
    name: 'Meta-Llama 3.3 (70B)',
    description: 'Fast & reliable - Best for tool use',
    icon: '🔧'
  }
];

