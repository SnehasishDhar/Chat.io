import { DocumentModel, IDocument } from "../models/Document";
import { DocumentChunk, IDocumentChunk } from "../models/DocumentChunk";
import { Types } from "mongoose";

export class DocumentRepository {
  async findById(id: string): Promise<IDocument | null> {
    return DocumentModel.findById(id);
  }

  async findByWorkspace(workspaceId: string): Promise<IDocument[]> {
    return DocumentModel.find({ workspaceId: new Types.ObjectId(workspaceId) });
  }

  async create(docData: Partial<IDocument>): Promise<IDocument> {
    const doc = new DocumentModel(docData);
    return doc.save();
  }

  async update(id: string, updateData: Partial<IDocument>): Promise<IDocument | null> {
    return DocumentModel.findByIdAndUpdate(id, { $set: updateData }, { new: true });
  }

  async delete(id: string): Promise<IDocument | null> {
    return DocumentModel.findByIdAndDelete(id);
  }

  // --- Document Chunk Methods ---
  async createChunk(chunkData: Partial<IDocumentChunk>): Promise<IDocumentChunk> {
    const chunk = new DocumentChunk(chunkData);
    return chunk.save();
  }

  async createChunks(chunksData: Partial<IDocumentChunk>[]): Promise<IDocumentChunk[]> {
    return DocumentChunk.insertMany(chunksData) as any;
  }

  async deleteChunksByDocument(documentId: string): Promise<any> {
    return DocumentChunk.deleteMany({ documentId: new Types.ObjectId(documentId) });
  }

  async deleteChunksByWorkspace(workspaceId: string): Promise<any> {
    return DocumentChunk.deleteMany({ workspaceId: new Types.ObjectId(workspaceId) });
  }

  async searchChunks(workspaceId: string, queryText: string, limit = 5): Promise<IDocumentChunk[]> {
    // 1. Text Search (if compound index is active)
    try {
      const results = await DocumentChunk.find(
        {
          workspaceId: new Types.ObjectId(workspaceId),
          $text: { $search: queryText },
        },
        { score: { $meta: "textScore" } }
      )
        .sort({ score: { $meta: "textScore" } })
        .limit(limit);

      if (results.length > 0) return results as any;
    } catch (e) {
      console.warn("Text search failed, falling back to regex word matching", e);
    }

    // 2. Fallback Regex Matching if Text index is not created or fails
    const keywords = queryText.split(/\s+/).filter(w => w.length > 2);
    if (keywords.length === 0) return [];
    
    const regexes = keywords.map(kw => new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    return DocumentChunk.find({
      workspaceId: new Types.ObjectId(workspaceId),
      $or: regexes.map(r => ({ content: { $regex: r } })),
    }).limit(limit) as any;
  }
}

export const documentRepository = new DocumentRepository();
