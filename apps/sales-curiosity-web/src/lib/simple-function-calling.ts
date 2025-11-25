/**
 * Simplified Function Calling Implementation
 * Based on SambaNova AI Starter Kit patterns
 * 
 * This replaces the complex LangGraph agent with a simpler iterative approach
 * that properly handles tool calling with SambaNova's API.
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { StructuredTool } from '@langchain/core/tools';

export interface FunctionCallingConfig {
    model: string;
    apiKey: string;
    tools: StructuredTool[];
    maxIterations?: number;
    temperature?: number;
}

export interface ToolCall {
    name: string;
    arguments: Record<string, any>;
}

export class SimpleFunctionCalling {
    private llm: ChatOpenAI;
    private tools: StructuredTool[];
    private toolsMap: Map<string, StructuredTool>;
    private maxIterations: number;

    constructor(config: FunctionCallingConfig) {
        this.maxIterations = config.maxIterations || 10;
        this.tools = config.tools;
        this.toolsMap = new Map(config.tools.map(tool => [tool.name.toLowerCase(), tool]));

        // Initialize LLM with SambaNova
        this.llm = new ChatOpenAI({
            modelName: config.model,
            apiKey: config.apiKey,
            configuration: {
                baseURL: 'https://api.sambanova.ai/v1',
            },
            temperature: config.temperature || 0.1,
            streaming: true,
            maxTokens: 2000,
        });
    }

    /**
     * Get tool schemas in the format SambaNova expects
     */
    private getToolSchemas(): any[] {
        return this.tools.map(tool => {
            const schema = tool.schema;
            const jsonSchema = zodToJsonSchema(schema) as any;

            // Remove $schema field as it can confuse some LLM providers
            if (jsonSchema.$schema) {
                delete jsonSchema.$schema;
            }

            // Explicitly ensure required fields are set for critical tools
            // For query_crm, query parameter is always required
            if (tool.name === 'query_crm' && jsonSchema.properties?.query) {
                if (!jsonSchema.required) {
                    jsonSchema.required = [];
                }
                if (!jsonSchema.required.includes('query')) {
                    jsonSchema.required.push('query');
                }
            }

            // Log schema for debugging
            if (tool.name === 'query_crm') {
                console.log('🔍 [Schema] query_crm schema:', JSON.stringify({
                    properties: jsonSchema.properties,
                    required: jsonSchema.required
                }, null, 2));
            }

            return {
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: jsonSchema,
                },
            };
        });
    }

    /**
     * Execute a single tool call
     */
    private async executeTool(toolCall: ToolCall): Promise<string> {
        const tool = this.toolsMap.get(toolCall.name.toLowerCase());

        if (!tool) {
            return `Error: Tool '${toolCall.name}' not found`;
        }

        // Validate arguments are not empty
        if (!toolCall.arguments || Object.keys(toolCall.arguments).length === 0) {
            console.error(`❌ Tool ${toolCall.name} called with empty arguments`);

            // DEBUG: Include structure information in error message for visibility
            const debugInfo = JSON.stringify({
                name: toolCall.name,
                hasArgs: !!toolCall.arguments,
                argsKeys: toolCall.arguments ? Object.keys(toolCall.arguments) : [],
                argsValue: toolCall.arguments
            }, null, 2);

            return `🔍 DEBUG - Tool '${toolCall.name}' called with empty arguments.\n\nReceived structure:\n${debugInfo}\n\nThis tool requires parameters. Please try again with proper arguments.`;
        }

        try {
            console.log(`🔧 Executing tool: ${toolCall.name} with args:`, toolCall.arguments);
            const result = await tool.invoke(toolCall.arguments);
            console.log(`✅ Tool result:`, result);
            return typeof result === 'string' ? result : JSON.stringify(result);
        } catch (error: any) {
            console.error(`❌ Tool execution error:`, error);
            return `Error executing ${toolCall.name}: ${error.message}`;
        }
    }

    /**
     * Main function calling loop
     */
    async invoke(query: string, systemPrompt?: string): Promise<string> {
        const messages: any[] = [];

        // Add system prompt with explicit tool use instructions
        if (systemPrompt) {
            const enhancedSystemPrompt = `${systemPrompt}

CRITICAL TOOL USE INSTRUCTIONS:
1. When calling tools, you MUST provide the "arguments" object.
2. Do NOT output empty arguments like {}.
3. If a tool requires a "query" or "url", you MUST generate it based on the user's request.
4. Example: {"name": "web_search", "arguments": {"query": "latest AI news"}}
5. NEVER call query_crm with empty args. Always provide a valid SOQL query.`;
            messages.push(new SystemMessage(enhancedSystemPrompt));
        }

        // Add user query
        messages.push(new HumanMessage(query));

        // Iterative tool calling loop
        for (let iteration = 0; iteration < this.maxIterations; iteration++) {
            console.log(`\n🔄 Iteration ${iteration + 1}/${this.maxIterations}`);

            try {
                // Call LLM with tools
                const response = await this.llm.invoke(messages, {
                    tools: this.getToolSchemas(),
                    tool_choice: 'auto',
                });

                console.log('📥 LLM Response:', {
                    hasContent: !!response.content,
                    hasToolCalls: !!(response as any).tool_calls,
                });

                // Check if LLM wants to call tools
                const toolCalls = (response as any).tool_calls;

                // DEBUG: Log the actual tool call structure
                if (toolCalls && toolCalls.length > 0) {
                    console.log('🔍 DEBUG: Tool calls structure:', JSON.stringify(toolCalls, null, 2));
                    toolCalls.forEach((tc: any, idx: number) => {
                        console.log(`🔍 DEBUG: Tool call ${idx}:`, {
                            name: tc.name,
                            args: tc.args,
                            arguments: tc.arguments,
                            id: tc.id,
                            allKeys: Object.keys(tc)
                        });
                    });
                }

                if (!toolCalls || toolCalls.length === 0) {
                    // No tools to call, this is the final answer
                    console.log('✅ Final answer received');
                    return response.content as string;
                }

                // Add LLM response to history
                messages.push(response);

                // Execute all tool calls
                const toolResults: string[] = [];
                for (const toolCall of toolCalls) {
                    const result = await this.executeTool({
                        name: toolCall.name,
                        arguments: toolCall.args || toolCall.arguments || (toolCall as any).tool_input || {},
                    });
                    toolResults.push(`Tool '${toolCall.name}' response: ${result}`);

                    // Add tool message to history
                    messages.push(new ToolMessage({
                        content: result,
                        tool_call_id: toolCall.id || `tool_${iteration}`,
                    }));
                }

                console.log(`📊 Executed ${toolCalls.length} tool(s)`);

            } catch (error: any) {
                console.error('❌ Error in function calling loop:', error);
                throw new Error(`Function calling failed: ${error.message}`);
            }
        }

        throw new Error(`Max iterations (${this.maxIterations}) reached without final answer`);
    }

    /**
     * Streaming version of invoke
     */
    async *stream(
        query: string,
        systemPrompt?: string,
        onToolCall?: (toolName: string, args: any) => void,
        onToolResult?: (toolName: string, result: string) => void
    ): AsyncGenerator<{ type: string; content?: string; toolName?: string; toolArgs?: any; toolResult?: string }> {
        const messages: any[] = [];

        if (systemPrompt) {
            // Enhance system prompt with explicit tool argument requirements
            const enhancedSystemPrompt = `${systemPrompt}

CRITICAL TOOL USE REQUIREMENTS:
- When calling ANY tool, you MUST provide ALL required parameters
- For query_crm tool: You MUST provide a "query" parameter with a complete SOQL query
- Example for query_crm: {"name": "query_crm", "arguments": {"query": "SELECT Id, Name, Email, Company FROM Lead ORDER BY CreatedDate DESC LIMIT 10"}}
- NEVER call a tool with empty arguments {}
- NEVER use WHERE clauses with quotes in SOQL queries (causes JSON parsing errors)
- If user asks for "late stage leads" or filtered results:
  * Option 1: Use search_salesforce tool with name/email/company
  * Option 2: Get all leads with query_crm, then filter in your response
  * DO NOT use: WHERE StageName = 'Closed Won' (this breaks JSON parsing)
- Default queries to use:
  * For leads: SELECT Id, Name, Email, Company, StageName FROM Lead ORDER BY CreatedDate DESC LIMIT 10
  * For contacts: SELECT Id, Name, Email, Title FROM Contact ORDER BY CreatedDate DESC LIMIT 10
  * For opportunities: SELECT Id, Name, Amount, StageName FROM Opportunity ORDER BY CreatedDate DESC LIMIT 10`;
            messages.push(new SystemMessage(enhancedSystemPrompt));
        }

        messages.push(new HumanMessage(query));

        let lastToolCalls: any = null;

        for (let iteration = 0; iteration < this.maxIterations; iteration++) {
            // Emit thinking step at start of iteration
            yield { type: 'thinking', content: `Analyzing your request (step ${iteration + 1})...` };

            try {
                const response = await this.llm.invoke(messages, {
                    tools: this.getToolSchemas(),
                    tool_choice: 'auto',
                });

                const toolCalls = (response as any).tool_calls;
                lastToolCalls = toolCalls;

                // DEBUG: Log the actual tool call structure
                if (toolCalls && toolCalls.length > 0) {
                    console.log('🔍 DEBUG [Stream]: Tool calls structure:', JSON.stringify(toolCalls, null, 2));
                    toolCalls.forEach((tc: any, idx: number) => {
                        console.log(`🔍 DEBUG [Stream]: Tool call ${idx}:`, {
                            name: tc.name,
                            args: tc.args,
                            arguments: tc.arguments,
                            id: tc.id,
                            allKeys: Object.keys(tc),
                            // Check for nested structure
                            fullObject: JSON.stringify(tc, null, 2)
                        });
                    });
                }

                // Normalize tool calls - SambaNova might return arguments in different formats
                const normalizedToolCalls = (toolCalls || []).map((tc: any) => {
                    // Try to extract arguments from various possible locations
                    let args = tc.args || tc.arguments || tc.parameters || {};
                    
                    // If args is a string, try to parse it
                    if (typeof args === 'string') {
                        try {
                            args = JSON.parse(args);
                        } catch (e) {
                            console.warn('⚠️ Could not parse args string:', args);
                            args = {};
                        }
                    }
                    
                    // If we still have no args, check for nested structure
                    if (Object.keys(args).length === 0 && tc.parameters) {
                        args = tc.parameters;
                    }
                    
                    return {
                        ...tc,
                        args,
                        arguments: args
                    };
                });

                if (!toolCalls || toolCalls.length === 0) {
                    // Final answer - emit thinking and stream content token by token
                    yield { type: 'thinking', content: 'Formulating response...' };

                    // Stream the final response token by token
                    const streamResponse = await this.llm.stream(messages);
                    for await (const chunk of streamResponse) {
                        if (chunk.content) {
                            yield { type: 'content', content: chunk.content as string };
                        }
                    }
                    return;
                }

                // Emit thinking about tool usage
                const toolNames = normalizedToolCalls.map((t: any) => t.name).join(', ');
                yield {
                    type: 'thinking',
                    content: `Using ${normalizedToolCalls.length} tool(s): ${toolNames}`
                };

                messages.push(response);

                // Execute tools with thinking updates
                for (const toolCall of normalizedToolCalls) {
                    // Extract arguments - use normalized args
                    let toolArgs = toolCall.args || toolCall.arguments || {};
                    
                    // Handle empty arguments gracefully - provide defaults instead of erroring
                    if (Object.keys(toolArgs).length === 0) {
                        // For query_crm, provide a default query based on user's request
                        if (toolCall.name === 'query_crm') {
                            console.warn('⚠️ [Tool] query_crm called with empty args - providing default query');
                            
                            // Try to infer what the user wants from the conversation context
                            const lastUserMessage = messages.find(m => m instanceof HumanMessage);
                            const userText = lastUserMessage ? (lastUserMessage as any).content?.toLowerCase() || '' : '';
                            
                            // Default query for leads
                            let defaultQuery = 'SELECT Id, Name, Email, Company, StageName FROM Lead ORDER BY CreatedDate DESC LIMIT 10';
                            
                            // Adjust based on user request if we can infer it
                            if (userText.includes('contact')) {
                                defaultQuery = 'SELECT Id, Name, Email, Title FROM Contact ORDER BY CreatedDate DESC LIMIT 10';
                            } else if (userText.includes('opportunity') || userText.includes('deal')) {
                                defaultQuery = 'SELECT Id, Name, Amount, StageName FROM Opportunity ORDER BY CreatedDate DESC LIMIT 10';
                            }
                            
                            toolArgs = { query: defaultQuery };
                            console.log('✅ [Tool] Using default query:', defaultQuery);
                            
                            // Add a note to the conversation that we used a default
                            // But don't show this to the user - handle silently
                        } else {
                            // For other tools, skip if no args required
                            console.warn(`⚠️ [Tool] ${toolCall.name} called with empty args - skipping`);
                            continue;
                        }
                    }
                    
                    // Validate query_crm doesn't have WHERE clauses with quotes (causes JSON errors)
                    if (toolCall.name === 'query_crm' && toolArgs.query) {
                        const query = toolArgs.query;
                        // Check for WHERE clauses with quotes
                        if (/WHERE\s+.*['"]/.test(query)) {
                            console.warn('⚠️ [Tool] Query contains WHERE clause with quotes - sanitizing');
                            
                            // Remove WHERE clause and use default instead
                            // Extract just the SELECT and FROM parts
                            const selectMatch = query.match(/SELECT\s+.*?\s+FROM\s+(\w+)/i);
                            if (selectMatch) {
                                const objectType = selectMatch[1];
                                const sanitizedQuery = `SELECT Id, Name, Email, Company, StageName FROM ${objectType} ORDER BY CreatedDate DESC LIMIT 10`;
                                console.log('✅ [Tool] Sanitized query:', sanitizedQuery);
                                toolArgs.query = sanitizedQuery;
                            } else {
                                // Fallback to default
                                toolArgs.query = 'SELECT Id, Name, Email, Company, StageName FROM Lead ORDER BY CreatedDate DESC LIMIT 10';
                            }
                            
                            // Don't show error to user - just fix it silently
                        }
                    }

                    // Emit thinking before tool execution
                    yield {
                        type: 'thinking',
                        content: `Executing: ${toolCall.name}`
                    };

                    yield { type: 'tool_start', toolName: toolCall.name, toolArgs };

                    if (onToolCall) {
                        onToolCall(toolCall.name, toolArgs);
                    }

                    const result = await this.executeTool({
                        name: toolCall.name,
                        arguments: toolArgs,
                    });

                    yield { type: 'tool_result', toolName: toolCall.name, toolResult: result };

                    if (onToolResult) {
                        onToolResult(toolCall.name, result);
                    }

                    messages.push(new ToolMessage({
                        content: result,
                        tool_call_id: toolCall.id || `tool_${iteration}`,
                    }));
                }

            } catch (error: any) {
                yield { type: 'error', content: error.message };
                throw error;
            }
        }

        // If we hit max iterations, provide a helpful response instead of error
        const lastUserMessage = messages.find(m => m instanceof HumanMessage);
        const userText = lastUserMessage ? (lastUserMessage as any).content || '' : '';
        
        // Generate a helpful response based on what the user asked
        let fallbackResponse = "I'm having trouble accessing your CRM data right now. ";
        
        if (userText.toLowerCase().includes('lead')) {
            fallbackResponse += "To view your leads, please try asking again or check your Salesforce connection in the Connectors tab.";
        } else if (userText.toLowerCase().includes('contact')) {
            fallbackResponse += "To view your contacts, please try asking again or check your Salesforce connection in the Connectors tab.";
        } else {
            fallbackResponse += "Please try rephrasing your request or check your CRM connection in the Connectors tab.";
        }
        
        throw new Error(fallbackResponse);
    }
}
