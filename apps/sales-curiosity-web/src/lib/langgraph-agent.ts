/**
 * LangGraph Agent for Curiosity Engine
 * 
 * Implements a StateGraph-based agent with:
 * - Smart model routing (DeepSeek vs Llama based on task)
 * - Tool execution with retry logic
 * - Streaming support for real-time responses
 * - Timeout detection and fallback
 */

import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { getFallbackModel } from './model-router';

/**
 * Agent State Definition
 * Tracks the conversation state as the agent progresses through the graph
 */
const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),
  modelUsed: Annotation<string>({
    reducer: (_, right) => right,
    default: () => '',
  }),
  userSelectedModel: Annotation<string | null>({
    reducer: (_, right) => right,
    default: () => null,
  }),
  retryCount: Annotation<number>({
    reducer: (_, right) => right,
    default: () => 0,
  }),
  tools: Annotation<DynamicStructuredTool[]>({
    reducer: (_, right) => right,
    default: () => [],
  }),
  timeout: Annotation<boolean>({
    reducer: (_, right) => right,
    default: () => false,
  }),
  toolsExecuted: Annotation<boolean>({
    reducer: (_, right) => right,
    default: () => false,
  }),
});

/**
 * Agent Node - Main reasoning node that calls the LLM
 */
async function agentNode(state: typeof AgentState.State) {
  const { messages, userSelectedModel, retryCount, tools, timeout, modelUsed, toolsExecuted } = state;
  
  // Use the model that was already selected (from state)
  let selectedModel = modelUsed;
  
  // If timeout occurred, try fallback model
  if (timeout && retryCount < 2) {
    const fallback = getFallbackModel(selectedModel, userSelectedModel);
    if (fallback) {
      selectedModel = fallback;
      console.log(`🔄 [Agent] Retry ${retryCount + 1} with fallback model: ${selectedModel}`);
    }
  }
  
  console.log(`🤖 [Agent Node] Using model: ${selectedModel}`);
  
  // Initialize the model with SambaNova API (OpenAI-compatible)
  const model = new ChatOpenAI({
    modelName: selectedModel,
    apiKey: process.env.SAMBANOVA_API_KEY, // Use apiKey for custom endpoints
    configuration: {
      baseURL: 'https://api.sambanova.ai/v1',
    },
    temperature: 0.1,
    streaming: true,
    maxTokens: 2000, // Limit response length
  });
  
  console.log('🔑 [Agent Node] API Key present:', !!process.env.SAMBANOVA_API_KEY);
  console.log('🔁 [Agent Node] Tools executed before:', toolsExecuted);
  
  // Only bind tools on FIRST call, not after tools have been executed
  // This forces the agent to provide a final summary without calling more tools
  const shouldBindTools = tools.length > 0 && !toolsExecuted;
  const modelWithTools = shouldBindTools ? model.bindTools(tools) : model;
  
  console.log('🔧 [Agent Node] Tools bound:', shouldBindTools, 'Tools count:', tools.length);
  
  // If tools were already executed, add strong instruction to generate final response
  let messagesToSend = messages;
  if (toolsExecuted && !shouldBindTools) {
    console.log('📝 [Agent Node] Tools already executed - forcing final response');
    // Add a system message to force the agent to respond with summary
    messagesToSend = [
      ...messages,
      new HumanMessage('Based on the tool results above, provide a helpful response to my original question. Be concise and actionable.')
    ];
  }
  
  console.log('📤 [Agent Node] Calling model with', messagesToSend.length, 'messages');
  
  // Call the model
  const response = await modelWithTools.invoke(messagesToSend);
  
  console.log('📥 [Agent Node] Model response received');
  console.log('📥 [Agent Node] Response has content:', !!response.content);
  console.log('📥 [Agent Node] Response has tool_calls:', !!(response as any).tool_calls);
  
  return {
    messages: [response],
    modelUsed: selectedModel,
  };
}

/**
 * Tools Node - Executes tool calls returned by the agent
 */
async function toolsNode(state: typeof AgentState.State) {
  const { messages, tools } = state;
  
  console.log('🔧 [Tools Node] Executing tools...');
  
  // Get the last AIMessage which should contain tool calls
  const lastMessage = messages[messages.length - 1];
  
  if (!('tool_calls' in lastMessage) || !lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
    console.log('⚠️ [Tools Node] No tool calls found');
    return { messages: [] };
  }
  
  const toolResults: BaseMessage[] = [];
  
  // Execute each tool call
  for (const toolCall of lastMessage.tool_calls) {
    const toolName = toolCall.name;
    const tool = tools.find(t => t.name === toolName);
    
    if (!tool) {
      console.error(`❌ [Tools Node] Tool not found: ${toolName}`);
      toolResults.push(
        new ToolMessage({
          content: `Error: Tool ${toolName} not found`,
          tool_call_id: toolCall.id || '',
        })
      );
      continue;
    }
    
    console.log(`🔧 [Tools Node] Executing: ${toolName}`);
    
    try {
      const result = await tool.invoke(toolCall.args || {});
      console.log(`✅ [Tools Node] ${toolName} completed`);
      
      toolResults.push(
        new ToolMessage({
          content: typeof result === 'string' ? result : JSON.stringify(result),
          tool_call_id: toolCall.id || '',
        })
      );
    } catch (error) {
      console.error(`❌ [Tools Node] Error executing ${toolName}:`, error);
      toolResults.push(
        new ToolMessage({
          content: `Error executing ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          tool_call_id: toolCall.id || '',
        })
      );
    }
  }
  
  console.log('✅ [Tools Node] All tools executed, returning', toolResults.length, 'results');
  
  return { 
    messages: toolResults,
    toolsExecuted: true // Mark that tools have been executed
  };
}

/**
 * Router Function - Decides whether to continue to tools or end
 */
function shouldContinue(state: typeof AgentState.State): string {
  const { messages, toolsExecuted } = state;
  const lastMessage = messages[messages.length - 1];
  
  console.log('🔀 [Router] Checking last message:', lastMessage.constructor.name);
  console.log('🔀 [Router] Tools already executed:', toolsExecuted);
  console.log('🔀 [Router] Has tool_calls property:', 'tool_calls' in lastMessage);
  console.log('🔀 [Router] tool_calls value:', (lastMessage as any).tool_calls);
  
  // If the last message has tool calls AND we haven't executed tools yet, go to tool executor
  if ('tool_calls' in lastMessage && (lastMessage as any).tool_calls && (lastMessage as any).tool_calls.length > 0 && !toolsExecuted) {
    console.log('→ [Router] Routing to tool executor node (found', (lastMessage as any).tool_calls.length, 'tool calls)');
    return 'execute_tools';
  }
  
  // Otherwise, we're done
  console.log('→ [Router] Routing to END');
  return END;
}

/**
 * Create and compile the agent graph
 */
export function createAgentGraph(tools: DynamicStructuredTool[]) {
  // Create the state graph
  const workflow = new StateGraph(AgentState)
    .addNode('agent', agentNode)
    .addNode('execute_tools', toolsNode) // Renamed from 'tools' to avoid conflict with state attribute
    .addEdge(START, 'agent')
    .addConditionalEdges('agent', shouldContinue, {
      execute_tools: 'execute_tools',
      [END]: END,
    })
    .addEdge('execute_tools', 'agent'); // After tools, go back to agent for final response
  
  // Compile the graph
  const graph = workflow.compile();
  
  return graph;
}

/**
 * Invoke the agent with streaming support
 * 
 * @param messages - Conversation history
 * @param tools - Available tools for the agent
 * @param selectedModel - The resolved model name to use (e.g., "Llama-3.3-70B-Instruct")
 * @param originalUserSelection - Original user's model selection (for fallback logic, e.g., "auto")
 * @param onStream - Callback for streaming events
 */
export async function invokeAgent(
  messages: BaseMessage[],
  tools: DynamicStructuredTool[],
  selectedModel: string,
  originalUserSelection: string | null,
  onStream?: (event: {
    type: 'content' | 'tool_start' | 'tool_result' | 'thinking' | 'done' | 'error';
    content?: string;
    tool?: string;
    result?: string;
    model?: string;
  }) => void
) {
  const graph = createAgentGraph(tools);
  
  console.log('🚀 [Agent] Starting invocation with', tools.length, 'tools');
  console.log('🎯 [Agent] Using model:', selectedModel, '(original selection:', originalUserSelection, ')');
  
  try {
    // Create initial state
    const initialState = {
      messages,
      tools,
      userSelectedModel: originalUserSelection, // Keep original for fallback logic
      retryCount: 0,
      timeout: false,
      modelUsed: selectedModel, // Use the resolved model name directly
      toolsExecuted: false, // Track if tools have been executed
    };
    
    // Stream the graph execution with recursion limit
    const stream = await graph.stream(initialState, {
      streamMode: 'values',
      recursionLimit: 10, // Limit to 10 iterations to prevent infinite loops
    });
    
    let finalResponse = '';
    let toolsExecuted: string[] = [];
    let fullThinking = '';
    let iterationCount = 0;
    
    console.log('🔄 [Agent] Starting stream processing...');
    
    for await (const event of stream) {
      iterationCount++;
      const { messages: stateMessages, modelUsed } = event;
      
      console.log(`📨 [Agent] Iteration ${iterationCount}: Stream event received, messages count:`, stateMessages?.length || 0);
      
      if (!stateMessages || stateMessages.length === 0) continue;
      
      const lastMessage = stateMessages[stateMessages.length - 1];
      console.log(`📨 [Agent] Iteration ${iterationCount}: Last message type:`, lastMessage.constructor.name);
      console.log(`📨 [Agent] Message _getType():`, (lastMessage as any)._getType?.());
      
      // Handle AI responses - use _getType() for minified builds
      const messageType = (lastMessage as any)._getType?.() || lastMessage.constructor.name;
      const isAIMessage = messageType === 'ai' || lastMessage instanceof AIMessage;
      
      if (isAIMessage) {
        // Always send content if present (even if tool_calls also present)
        const content = typeof lastMessage.content === 'string' ? lastMessage.content : '';
        console.log('💬 [Agent] AIMessage content type:', typeof lastMessage.content);
        console.log('💬 [Agent] AIMessage content length:', content.length);
        console.log('💬 [Agent] AIMessage content preview:', content.substring(0, 200));
        
        if (content) {
          finalResponse += content;
          
          // Parse DeepSeek-R1 thinking tags if present
          const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
          const thinking = thinkMatch ? thinkMatch[1].trim() : '';
          let finalContent = content;
          
          if (thinking) {
            // Remove thinking tags from main content
            finalContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
            fullThinking += thinking;
            
            console.log('🧠 [Agent] Parsed thinking:', thinking.substring(0, 100) + '...');
          }
          
          // Send the final content (without thinking tags)
          if (onStream && finalContent) {
            console.log('💬 [Agent] Sending content chunk, length:', finalContent.length);
            onStream({
              type: 'content',
              content: finalContent,
              model: modelUsed,
            });
          }
        }
        
        // Also check for tool calls
        if ('tool_calls' in lastMessage && lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
          console.log('🔧 [Agent] Found', lastMessage.tool_calls.length, 'tool calls');
          for (const toolCall of lastMessage.tool_calls) {
            toolsExecuted.push(toolCall.name);
            console.log('🔧 [Agent] Tool call:', toolCall.name);
            if (onStream) {
              onStream({
                type: 'tool_start',
                tool: toolCall.name,
              });
            }
          }
        } else {
          console.log('📝 [Agent] No tool calls in this message - should be final response');
        }
      }
      
      // Handle tool results - use _getType() for minified builds
      const isToolMessage = (lastMessage as any)._getType?.() === 'tool' || lastMessage instanceof ToolMessage;
      
      if (isToolMessage) {
        const result = typeof lastMessage.content === 'string' ? lastMessage.content : '';
        if (onStream) {
          onStream({
            type: 'tool_result',
            result,
          });
        }
      }
    }
    
    console.log('✅ [Agent] Stream processing complete');
    console.log('✅ [Agent] Final response length:', finalResponse.length);
    console.log('✅ [Agent] Tools executed:', toolsExecuted);
    console.log('✅ [Agent] Thinking length:', fullThinking.length);
    
    // Send thinking if we captured any
    if (onStream && fullThinking) {
      onStream({
        type: 'thinking',
        content: fullThinking,
      });
    }
    
    // Send done event
    if (onStream) {
      console.log('🏁 [Agent] Sending done event');
      onStream({ type: 'done' });
    }
    
    return {
      response: finalResponse,
      toolsUsed: toolsExecuted,
      thinking: fullThinking,
    };
    
  } catch (error) {
    console.error('❌ [Agent] Error during invocation:', error);
    if (onStream) {
      onStream({
        type: 'error',
        content: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    throw error;
  }
}

