/**
 * Smart Model Router for LangGraph Agent
 * 
 * Routes requests to the optimal model based on user selection and request type.
 * Priority:
 * 1. User manually selected model → Use that model (respect user choice)
 * 2. "Auto" mode → Smart routing based on request type
 */

// Available models (must match SambaNova Cloud model IDs exactly)
export const MODELS = {
  AUTO: 'auto',
  DEEPSEEK_R1: 'DeepSeek-R1-0528',
  LLAMA_3_3: 'Meta-Llama-3.3-70B-Instruct', // Correct SambaNova model ID
  LLAMA_3_1_8B: 'Meta-Llama-3.1-8B-Instruct', // Also available
  DEEPSEEK_V3: 'DeepSeek-V3-0324',
  DEEPSEEK_V3_1: 'DeepSeek-V3.1',
} as const;

// Tool-based keywords that indicate need for function calling
const TOOL_KEYWORDS = [
  'check', 'search', 'find', 'look', 'get', 'fetch',
  'calendar', 'email', 'draft', 'send', 'schedule', 'create',
  'salesforce', 'crm', 'contact', 'lead', 'task', 'note',
  'outlook', 'gmail', 'meeting', 'event', 'appointment'
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
 * 
 * @param userMessage - The user's input message
 * @param userSelectedModel - The model the user selected (or 'auto')
 * @returns The model ID to use
 */
export function selectModel(
  userMessage: string,
  userSelectedModel: string | null
): string {
  // If user explicitly selected a specific model (not "auto"), honor it
  if (userSelectedModel && userSelectedModel !== MODELS.AUTO) {
    console.log('🎯 [Model Router] User selected:', userSelectedModel);
    return userSelectedModel;
  }
  
  // Auto mode - use smart routing
  const isToolBased = isToolBasedRequest(userMessage);
  
  if (isToolBased) {
    console.log('🔧 [Model Router] Tool-based request detected → Using Llama-3.3-70B');
    return MODELS.LLAMA_3_3;
  } else {
    console.log('🧠 [Model Router] Reasoning-based request detected → Using DeepSeek-R1');
    return MODELS.DEEPSEEK_R1;
  }
}

/**
 * Get fallback model when primary model fails or times out
 * 
 * @param currentModel - The model that failed/timed out
 * @param userSelectedModel - User's manual selection (if any)
 * @returns Fallback model to try
 */
export function getFallbackModel(
  currentModel: string,
  userSelectedModel: string | null
): string | null {
  // If user manually selected a model, don't override with fallback
  if (userSelectedModel && userSelectedModel !== MODELS.AUTO) {
    console.log('⚠️ [Model Router] User manually selected model - no fallback');
    return null;
  }
  
  // If DeepSeek failed, fallback to Llama (more reliable for tools)
  if (currentModel === MODELS.DEEPSEEK_R1) {
    console.log('🔄 [Model Router] DeepSeek-R1 timeout → Falling back to Meta-Llama-3.3-70B');
    return MODELS.LLAMA_3_3;
  }
  
  // If Llama failed, try smaller Llama as last resort
  if (currentModel === MODELS.LLAMA_3_3) {
    console.log('🔄 [Model Router] Meta-Llama-3.3-70B timeout → Falling back to Meta-Llama-3.1-8B');
    return MODELS.LLAMA_3_1_8B;
  }
  
  // No more fallbacks
  console.log('❌ [Model Router] No fallback available');
  return null;
}

/**
 * Model configurations for UI display
 */
export const MODEL_OPTIONS = [
  {
    id: MODELS.AUTO,
    name: 'Auto (Recommended)',
    description: 'Smart model selection based on task',
    icon: '🤖'
  },
  {
    id: MODELS.DEEPSEEK_R1,
    name: 'DeepSeek-R1 (67B)',
    description: 'Most powerful - Best for complex reasoning',
    icon: '🧠'
  },
  {
    id: MODELS.LLAMA_3_3,
    name: 'Meta-Llama 3.3 (70B)',
    description: 'Fast & reliable - Best for tool use',
    icon: '🔧'
  },
  {
    id: MODELS.DEEPSEEK_V3,
    name: 'DeepSeek V3',
    description: 'Powerful general-purpose model',
    icon: '💡'
  },
  {
    id: MODELS.LLAMA_3_1_8B,
    name: 'Meta-Llama 3.1 (8B)',
    description: 'Ultra-fast - Simple tasks',
    icon: '⚡'
  }
];

