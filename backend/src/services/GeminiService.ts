import { GoogleGenerativeAI } from "@google/generative-ai";
import { ILLMProvider, LLMGenerateOptions, ChatMessage } from "./LLMService";

export class GeminiService implements ILLMProvider {
  private getApiKey(): string {
    return process.env.GEMINI_API_KEY || "";
  }

  private getClient(): GoogleGenerativeAI {
    const apiKey = this.getApiKey();
    if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
      throw new Error("Gemini API key is not configured. Please set GEMINI_API_KEY in .env");
    }
    return new GoogleGenerativeAI(apiKey);
  }

  async generateResponse(prompt: string, options?: LLMGenerateOptions): Promise<string> {
    const client = this.getClient();
    const modelName = options?.model || "gemini-1.5-flash";
    
    const model = client.getGenerativeModel({
      model: modelName,
      systemInstruction: options?.systemPrompt,
    });

    const contents: any[] = [];
    if (options?.history) {
      for (const msg of options.history) {
        contents.push({
          role: msg.role === "model" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }
    }
    
    contents.push({ role: "user", parts: [{ text: prompt }] });

    const result = await model.generateContent({
      contents,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
      },
    });

    return result.response.text() || "";
  }

  async streamResponse(
    prompt: string,
    onChunk: (text: string) => void,
    options?: LLMGenerateOptions
  ): Promise<void> {
    const client = this.getClient();
    const modelName = options?.model || "gemini-1.5-flash";

    const model = client.getGenerativeModel({
      model: modelName,
      systemInstruction: options?.systemPrompt,
    });

    const contents: any[] = [];
    if (options?.history) {
      for (const msg of options.history) {
        contents.push({
          role: msg.role === "model" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }
    }

    contents.push({ role: "user", parts: [{ text: prompt }] });

    const result = await model.generateContentStream({
      contents,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
      },
    });

    for await (const chunk of result.stream) {
      // In @google/generative-ai, stream is an async iterable yielding GenerateContentResponse
      const chunkText = chunk.text();
      if (chunkText) {
        onChunk(chunkText);
      }
    }
  }

  async detectHumanHandoff(message: string): Promise<boolean> {
    // 1. Rule-based checks (very fast, saves costs)
    const lowerMessage = message.toLowerCase().trim();
    const escalationPhrases = [
      "talk to a human",
      "connect me to support",
      "speak to a person",
      "talk to an agent",
      "live support",
      "human representative",
      "speak to someone",
      "customer support",
      "real person",
      "live agent",
      "talk to agent",
      "escalate",
    ];

    for (const phrase of escalationPhrases) {
      if (lowerMessage.includes(phrase)) {
        return true;
      }
    }

    // 2. Gemini classification fallback
    try {
      const client = this.getClient();
      const model = client.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: "You are an intent classifier. Answer ONLY with 'YES' or 'NO' (no spaces, no punctuation).",
      });

      const responseText = await this.generateResponse(
        `Does the following message indicate the user wants to talk to a human support agent, a real person, or customer representative? \nMessage: "${message}"`,
        {
          model: "gemini-1.5-flash",
          temperature: 0.1,
          systemPrompt: "You are an intent classifier. Answer ONLY with 'YES' or 'NO' (no spaces, no punctuation).",
        }
      );

      const decision = responseText.trim().toUpperCase();
      return decision.includes("YES");
    } catch {
      // Fallback to false if Gemini is offline or fails
      return false;
    }
  }
}

export const geminiService = new GeminiService();
