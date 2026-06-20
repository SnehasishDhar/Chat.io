import { documentRepository } from "../repositories/DocumentRepository";
import { IDocument } from "../models/Document";
import { IDocumentChunk } from "../models/DocumentChunk";
import { parseDocument } from "../utils/documentParser";
import { Types } from "mongoose";
import fs from "fs";

export class DocumentService {
  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n{3,}/g, "\n\n") // Collapse consecutive newlines
      .replace(/[ \t]+/g, " ")      // Collapse horizontal tabs/spaces
      .trim();
  }

  private chunkText(text: string, chunkSize = 1000, overlap = 100): string[] {
    const chunks: string[] = [];
    if (!text || text.length === 0) return chunks;

    let startIndex = 0;
    while (startIndex < text.length) {
      // Create slice of specified chunk size
      const chunk = text.substring(startIndex, startIndex + chunkSize);
      chunks.push(chunk);
      
      // Move forward by size minus overlap
      startIndex += (chunkSize - overlap);
      
      // Avoid infinite loop if parameters are invalid
      if (chunkSize <= overlap) {
        break;
      }
    }
    return chunks;
  }

  async processDocument(
    workspaceId: string,
    fileName: string,
    mimeType: string,
    fileSize: number,
    filePath: string,
    uploadedById?: string
  ): Promise<IDocument> {
    // 1. Create document record in database (pending state)
    const doc = await documentRepository.create({
      workspaceId: new Types.ObjectId(workspaceId),
      name: fileName,
      mimeType,
      fileSize,
      filePath,
      processed: false,
      uploadedBy: uploadedById ? new Types.ObjectId(uploadedById) : undefined,
    });

    try {
      // 2. Parse document text content
      const rawText = await parseDocument(filePath, mimeType);
      
      // 3. Clean text content
      const cleanedText = this.cleanText(rawText);
      
      // 4. Update document with extracted text
      await documentRepository.update(doc._id.toString(), {
        extractedText: cleanedText,
      });

      // 5. Chunk the text
      const rawChunks = this.chunkText(cleanedText, 1000, 100);
      
      // 6. Insert chunks to DB
      const chunkObjects = rawChunks.map((content, idx) => ({
        workspaceId: doc.workspaceId,
        documentId: doc._id as Types.ObjectId,
        content,
        chunkIndex: idx,
        metadata: {
          documentName: fileName,
          chunkLength: content.length,
        },
      }));

      if (chunkObjects.length > 0) {
        await documentRepository.createChunks(chunkObjects as unknown as IDocumentChunk[]);
      }

      // 7. Mark document as processed
      const updatedDoc = await documentRepository.update(doc._id.toString(), {
        processed: true,
      });

      return updatedDoc!;
    } catch (error) {
      // If parsing fails, delete document record to avoid corrupted entries
      await documentRepository.delete(doc._id.toString());
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {}
      throw error;
    }
  }

  async listDocuments(workspaceId: string): Promise<IDocument[]> {
    return documentRepository.findByWorkspace(workspaceId);
  }

  async deleteDocument(id: string): Promise<void> {
    const doc = await documentRepository.findById(id);
    if (!doc) {
      throw new Error("Document not found");
    }

    // Delete chunks from DB
    await documentRepository.deleteChunksByDocument(id);
    
    // Delete file from disk
    if (fs.existsSync(doc.filePath)) {
      try {
        fs.unlinkSync(doc.filePath);
      } catch (err) {
        console.error("Failed to delete physical file:", err);
      }
    }

    // Delete document record
    await documentRepository.delete(id);
  }
}

export const documentService = new DocumentService();
