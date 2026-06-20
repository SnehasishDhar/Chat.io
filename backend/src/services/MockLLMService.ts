import { ILLMProvider, LLMGenerateOptions } from "./LLMService";

export class MockLLMService implements ILLMProvider {
  async generateResponse(prompt: string, options?: LLMGenerateOptions): Promise<string> {
    return `[Mock Response] I received your message: "${prompt}". (Note: Gemini API key is not set, running in mock mode).`;
  }

  async streamResponse(
    prompt: string,
    onChunk: (text: string) => void,
    options?: LLMGenerateOptions
  ): Promise<void> {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const thoughts = [
      "<think>\n",
      "Analyzing user request...\n",
      `Query: "${prompt}"\n`,
      `Workspace model: ${options?.model || "Mock-LLM-1.0"}\n`,
      "Searching local database facts...\n",
      "Generating optimal customer response...\n",
      "</think>\n\n",
    ];

    const responses = [
      "Hello! Thank you for reaching out to us.\n\n",
      "This is a simulated streaming response from the **Chat.io** mock engine.\n\n",
      "We are currently running in **MOCK** mode because no Gemini API key was found in the configuration.\n\n",
      `You asked: *"${prompt}"*.\n\n`,
      "Once you supply a valid `GEMINI_API_KEY` in the `.env` file and set `LLM_PROVIDER=GEMINI`, this widget will stream live responses from Google Gemini.\n\n",
      "If you need agent assistance, just type **'talk to human'** to trigger the real-time handoff system! How can I help you further?",
    ];

    // Stream thoughts
    for (const chunk of thoughts) {
      onChunk(chunk);
      await sleep(150);
    }

    // Stream response
    for (const chunk of responses) {
      onChunk(chunk);
      await sleep(250);
    }
  }

  async detectHumanHandoff(message: string): Promise<boolean> {
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
    return false;
  }
}

export const mockLLMService = new MockLLMService();
