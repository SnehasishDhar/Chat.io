import { UsageRecord, IUsageRecord } from "../models/UsageRecord";
import { Types } from "mongoose";

export class UsageRepository {
  async findRecord(workspaceId: string, date: string): Promise<IUsageRecord | null> {
    return UsageRecord.findOne({
      workspaceId: new Types.ObjectId(workspaceId),
      date,
    });
  }

  async getWorkspaceUsageSummary(workspaceId: string): Promise<IUsageRecord[]> {
    return UsageRecord.find({ workspaceId: new Types.ObjectId(workspaceId) }).sort({ date: -1 });
  }

  async incrementUsage(
    workspaceId: string,
    date: string,
    incData: { messages?: number; tokens?: number; requests?: number }
  ): Promise<IUsageRecord | null> {
    const update: any = {};
    if (incData.messages) update.$inc = { ...update.$inc, messageCount: incData.messages };
    if (incData.tokens) update.$inc = { ...update.$inc, tokenCount: incData.tokens };
    if (incData.requests) update.$inc = { ...update.$inc, geminiRequests: incData.requests };

    return UsageRecord.findOneAndUpdate(
      { workspaceId: new Types.ObjectId(workspaceId), date },
      update,
      { new: true, upsert: true }
    );
  }
}

export const usageRepository = new UsageRepository();
