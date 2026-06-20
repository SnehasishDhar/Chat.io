import { Schema, model, Document, Types } from "mongoose";

export interface IDocument extends Document {
  workspaceId: Types.ObjectId;
  name: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  extractedText?: string;
  processed: boolean;
  uploadedBy?: Types.ObjectId;
  createdAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    filePath: { type: String, required: true },
    extractedText: { type: String },
    processed: { type: Boolean, default: false },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const DocumentModel = model<IDocument>("Document", DocumentSchema);
