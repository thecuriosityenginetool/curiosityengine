/**
 * Simplified Function Calling Implementation
 * Based on SambaNova AI Starter Kit patterns
 * 
 * This replaces the complex LangGraph agent with a simpler iterative approach
 * that properly handles tool calling with SambaNova's API.
 */

import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
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
            return {
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: schema,
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

        // Add system prompt
        if (systemPrompt) {
            messages.push(new SystemMessage(systemPrompt));
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
            messages.push(new SystemMessage(systemPrompt));
        }

        messages.push(new HumanMessage(query));

        for (let iteration = 0; iteration < this.maxIterations; iteration++) {
            // Emit thinking step at start of iteration
            yield { type: 'thinking', content: `Analyzing your request (step ${iteration + 1})...` };

            try {
                const response = await this.llm.invoke(messages, {
                    tools: this.getToolSchemas(),
                });

                const toolCalls = (response as any).tool_calls;

                // DEBUG: Log the actual tool call structure
                if (toolCalls && toolCalls.length > 0) {
                    console.log('🔍 DEBUG [Stream]: Tool calls structure:', JSON.stringify(toolCalls, null, 2));
                    toolCalls.forEach((tc: any, idx: number) => {
                        console.log(`🔍 DEBUG [Stream]: Tool call ${idx}:`, {
                            name: tc.name,
                            args: tc.args,
                            arguments: tc.arguments,
                            id: tc.id,
                            allKeys: Object.keys(tc)
                        });
                    });
                }

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
                const toolNames = toolCalls.map((t: any) => t.name).join(', ');
                yield {
                    type: 'thinking',
                    content: `Using ${toolCalls.length} tool(s): ${toolNames}`
                };

                messages.push(response);

                // Execute tools with thinking updates
                for (const toolCall of toolCalls) {
                    // Emit thinking before tool execution
                    yield {
                        type: 'thinking',
                        content: `Executing: ${toolCall.name}`
                    };

                    yield { type: 'tool_start', toolName: toolCall.name, toolArgs: toolCall.args || toolCall.arguments || (toolCall as any).tool_input || {} };

                    if (onToolCall) {
                        onToolCall(toolCall.name, toolCall.args || toolCall.arguments || (toolCall as any).tool_input || {});
                    }

                    const result = await this.executeTool({
                        name: toolCall.name,
                        arguments: toolCall.args || toolCall.arguments || (toolCall as any).tool_input || {},
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

        throw new Error(`Max iterations reached`);
    }
}
