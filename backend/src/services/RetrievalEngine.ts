import { documentRepository } from "../repositories/DocumentRepository";
import { IDocumentChunk } from "../models/DocumentChunk";

export class RetrievalEngine {
  /**
   * Scores a document chunk against a user query.
   */
  private scoreChunk(content: string, query: string): number {
    const cleanContent = content.toLowerCase();
    const cleanQuery = query.toLowerCase().trim();
    
    if (cleanQuery.length === 0) return 0;
    
    let score = 0;

    // 1. Exact Phrase Match (weight: 15)
    if (cleanContent.includes(cleanQuery)) {
      score += 15;
    }

    // Split query into individual keywords
    const keywords = cleanQuery
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2); // Only match words longer than 2 characters

    if (keywords.length === 0) return score;

    // 2. Keyword presence (weight: 3 per unique keyword present)
    // 3. Keyword frequency (weight: 0.5 per occurrences)
    for (const word of keywords) {
      if (cleanContent.includes(word)) {
        score += 3; // Word exists in chunk
        
        // Count occurrences
        const occurrences = cleanContent.split(word).length - 1;
        score += occurrences * 0.5;
      }
    }

    return score;
  }

  /**
   * Retrieves relevant text chunks for a query inside a workspace.
   */
  async retrieveContext(
    workspaceId: string,
    query: string,
    limit = 4,
    scoreThreshold = 2.0
  ): Promise<{ chunks: IDocumentChunk[]; contextText: string }> {
    if (process.env.RAG_ENABLED === "false") {
      return { chunks: [], contextText: "" };
    }

    // 1. Pull matching candidates from DB
    const candidates = await documentRepository.searchChunks(workspaceId, query, limit * 3);

    // 2. Score candidate chunks
    const scored = candidates
      .map((chunk) => {
        const score = this.scoreChunk(chunk.content, query);
        return { chunk, score };
      })
      // 3. Filter by score threshold
      .filter((item) => item.score >= scoreThreshold)
      // 4. Sort by score in descending order
      .sort((a, b) => b.score - a.score)
      // 5. Select top matching chunks
      .slice(0, limit);

    const chunks = scored.map((item) => item.chunk);
    
    // Join chunks to construct LLM context block
    const contextText = chunks
      .map((c, i) => `[Document: ${c.metadata?.get("documentName") || "Reference"}] \n${c.content}`)
      .join("\n\n---\n\n");

    return { chunks, contextText };
  }
}

export const retrievalEngine = new RetrievalEngine();
