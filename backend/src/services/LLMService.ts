export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export interface LLMGenerateOptions {
  temperature?: number;
  model?: string;
  systemPrompt?: string;
  history?: ChatMessage[];
}

export interface ILLMProvider {
  generateResponse(prompt: string, options?: LLMGenerateOptions): Promise<string>;
  streamResponse(
    prompt: string,
    onChunk: (text: string) => void,
    options?: LLMGenerateOptions
  ): Promise<void>;
  detectHumanHandoff(message: string): Promise<boolean>;
}
