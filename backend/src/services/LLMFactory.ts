import { ILLMProvider } from "./LLMService";
import { geminiService } from "./GeminiService";
import { mockLLMService } from "./MockLLMService";

export class LLMFactory {
  getProvider(): ILLMProvider {
    const provider = (process.env.LLM_PROVIDER || "MOCK").toUpperCase();
    const apiKey = process.env.GEMINI_API_KEY;

    if (provider === "GEMINI" && apiKey && apiKey !== "YOUR_GEMINI_API_KEY_HERE") {
      return geminiService;
    }

    if (provider === "GEMINI") {
      console.warn(
        "LLM_PROVIDER is configured as GEMINI but GEMINI_API_KEY is missing/invalid. Falling back to MOCK provider."
      );
    } else {
      console.info("LLM_PROVIDER is configured as MOCK. Streaming simulated responses.");
    }

    return mockLLMService;
  }
}

export const llmFactory = new LLMFactory();
