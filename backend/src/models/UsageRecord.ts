import { Schema, model, Document, Types } from "mongoose";

export interface IUsageRecord extends Document {
  workspaceId: Types.ObjectId;
  date: string; // Format: YYYY-MM-DD
  messageCount: number;
  tokenCount: number;
  geminiRequests: number;
}

const UsageRecordSchema = new Schema<IUsageRecord>({
  workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
  date: { type: String, required: true },
  messageCount: { type: Number, default: 0 },
  tokenCount: { type: Number, default: 0 },
  geminiRequests: { type: Number, default: 0 },
});

// Compound unique key to enforce single record per workspace per day
UsageRecordSchema.index({ workspaceId: 1, date: 1 }, { unique: true });

export const UsageRecord = model<IUsageRecord>("UsageRecord", UsageRecordSchema);
