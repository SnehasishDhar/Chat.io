import { Schema, model, Document, Types } from "mongoose";

export type SenderType = "USER" | "BOT" | "AGENT";

export interface IMessage extends Document {
  conversationId: Types.ObjectId;
  senderType: SenderType;
  senderId?: string; // User ID string for agents, session UUID for user, or empty for bot
  content: string;
  timestamp: Date;
}

const MessageSchema = new Schema<IMessage>({
  conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
  senderType: { type: String, enum: ["USER", "BOT", "AGENT"], required: true },
  senderId: { type: String },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, index: true },
});

export const Message = model<IMessage>("Message", MessageSchema);
