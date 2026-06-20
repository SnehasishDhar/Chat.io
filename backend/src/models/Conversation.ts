import { Schema, model, Document, Types } from "mongoose";

export type ConversationStatus = "BOT" | "WAITING_FOR_AGENT" | "HUMAN_ACTIVE" | "CLOSED";

export interface IConversation extends Document {
  workspaceId: Types.ObjectId;
  sessionId: string; // Unique visitor session string
  status: ConversationStatus;
  assignedAgentId?: Types.ObjectId;
  startedAt: Date;
  lastActivity: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    sessionId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["BOT", "WAITING_FOR_AGENT", "HUMAN_ACTIVE", "CLOSED"],
      default: "BOT",
      index: true,
    },
    assignedAgentId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    startedAt: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

// Ensure unique sessionId per workspace
ConversationSchema.index({ workspaceId: 1, sessionId: 1 }, { unique: true });

export const Conversation = model<IConversation>("Conversation", ConversationSchema);
