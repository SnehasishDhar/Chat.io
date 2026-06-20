import { Schema, model, Document, Types } from "mongoose";

export type WorkspaceRole = "OWNER" | "ADMIN" | "AGENT";

export interface IWorkspaceMember extends Document {
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;
  role: WorkspaceRole;
  invitedBy?: Types.ObjectId;
  joinedAt: Date;
}

const WorkspaceMemberSchema = new Schema<IWorkspaceMember>({
  workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  role: { type: String, enum: ["OWNER", "ADMIN", "AGENT"], required: true },
  invitedBy: { type: Schema.Types.ObjectId, ref: "User" },
  joinedAt: { type: Date, default: Date.now },
});

// A user can only have one membership record per workspace
WorkspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

export const WorkspaceMember = model<IWorkspaceMember>("WorkspaceMember", WorkspaceMemberSchema);
