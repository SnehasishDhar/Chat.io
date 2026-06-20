import { Schema, model, Document, Types } from "mongoose";

export interface INotification extends Document {
  userId?: Types.ObjectId; // Specific agent, or null to notify all workspace members
  workspaceId: Types.ObjectId;
  type: string; // e.g. "WAITING_FOR_AGENT"
  message: string;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    type: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Notification = model<INotification>("Notification", NotificationSchema);
