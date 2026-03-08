import Groq from 'groq-sdk';
import { config } from '../config.js';
import { dbService, Message } from '../db/index.js';
import { executeTool, getToolDefinitions } from '../tools/index.js';

const groq = new Groq({ apiKey: config.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are OpenGravity, a personal AI agent running locally. 
You are simple, secure, and helpful. You use Telegram as your interface.
You have access to tools. If you need to use a tool, suggest it using the function calling format.
Be concise and clear in your responses.`;

export class Agent {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async chat(userInput: string) {
    // 1. Save user message
    await dbService.addMessage(this.userId, 'user', userInput);

    // 2. Get history
    const history = await dbService.getHistory(this.userId);
    
    const messages: any[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history
    ];

    let iterations = 0;
    const MAX_ITERATIONS = 5;

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: messages,
        tools: getToolDefinitions().length > 0 ? getToolDefinitions().map(def => ({ type: 'function', function: def })) : undefined,
      }) as any;

      const message = response.choices[0].message;

      if (!message.tool_calls || message.tool_calls.length === 0) {
        const content = message.content || "No he podido generar una respuesta.";
        await dbService.addMessage(this.userId, 'assistant', content);
        return content;
      }

      // Add assistant's tool call to history
      messages.push(message);

      // Execute tool calls
      for (const toolCall of message.tool_calls) {
        const functionName = toolCall.function?.name;
        if (!functionName) continue;

        const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
        
        console.log(`🛠️ Ejecutando herramienta: ${functionName}`);
        try {
          const result = await executeTool(functionName, functionArgs);
          
          messages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: result,
          });
        } catch (toolError) {
          console.error(`❌ Error en herramienta ${functionName}:`, toolError);
          messages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: "Error al ejecutar la herramienta.",
          });
        }
      }
    }

    return "Lo siento, he alcanzado el límite de iteraciones para esta petición.";
  }
}
