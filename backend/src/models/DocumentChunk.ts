import { Schema, model, Document, Types } from "mongoose";

export interface IDocumentChunk extends Document {
  workspaceId: Types.ObjectId;
  documentId: Types.ObjectId;
  content: string;
  chunkIndex: number;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const DocumentChunkSchema = new Schema<IDocumentChunk>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    documentId: { type: Schema.Types.ObjectId, ref: "Document", required: true, index: true },
    content: { type: String, required: true },
    chunkIndex: { type: Number, required: true },
    metadata: { type: Schema.Types.Map, of: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Compound text index for isolated, fast search within a workspace
DocumentChunkSchema.index({ workspaceId: 1, content: "text" });

export const DocumentChunk = model<IDocumentChunk>("DocumentChunk", DocumentChunkSchema);
