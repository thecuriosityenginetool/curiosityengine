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
});

/**
 * Agent Node - Main reasoning node that calls the LLM
 */
async function agentNode(state: typeof AgentState.State) {
  const { messages, userSelectedModel, retryCount, tools, timeout, modelUsed } = state;
  
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
  });
  
  console.log('🔑 [Agent Node] API Key present:', !!process.env.SAMBANOVA_API_KEY);
  
  // Bind tools if available
  const modelWithTools = tools.length > 0 ? model.bindTools(tools) : model;
  
  // Call the model
  const response = await modelWithTools.invoke(messages);
  
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
  
  return { messages: toolResults };
}

/**
 * Router Function - Decides whether to continue to tools or end
 */
function shouldContinue(state: typeof AgentState.State): string {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  
  // If the last message has tool calls, go to tool executor node
  if ('tool_calls' in lastMessage && lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    console.log('→ [Router] Routing to tool executor node');
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
    };
    
    // Stream the graph execution
    const stream = await graph.stream(initialState, {
      streamMode: 'values',
    });
    
    let finalResponse = '';
    let toolsExecuted: string[] = [];
    
    for await (const event of stream) {
      const { messages: stateMessages, modelUsed } = event;
      
      if (!stateMessages || stateMessages.length === 0) continue;
      
      const lastMessage = stateMessages[stateMessages.length - 1];
      
      // Handle AI responses
      if (lastMessage instanceof AIMessage) {
        // Check for tool calls
        if ('tool_calls' in lastMessage && lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
          for (const toolCall of lastMessage.tool_calls) {
            toolsExecuted.push(toolCall.name);
            if (onStream) {
              onStream({
                type: 'tool_start',
                tool: toolCall.name,
              });
            }
          }
        } else {
          // Regular content
          const content = typeof lastMessage.content === 'string' ? lastMessage.content : '';
          if (content) {
            finalResponse += content;
            if (onStream) {
              onStream({
                type: 'content',
                content,
                model: modelUsed,
              });
            }
          }
        }
      }
      
      // Handle tool results
      if (lastMessage instanceof ToolMessage) {
        const result = typeof lastMessage.content === 'string' ? lastMessage.content : '';
        if (onStream) {
          onStream({
            type: 'tool_result',
            result,
          });
        }
      }
    }
    
    // Send done event
    if (onStream) {
      onStream({ type: 'done' });
    }
    
    return {
      response: finalResponse,
      toolsUsed: toolsExecuted,
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

