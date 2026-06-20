import { Schema, model, Types } from "mongoose";

export interface IWorkspace {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  ownerId: Types.ObjectId;
  embedId: string; // Unique public UUID for widgets
  color: string;
  logoUrl?: string;
  greeting?: string;
  language: string;
  systemPrompt?: string;
  model: string;
  temperature: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    embedId: { type: String, required: true, unique: true, index: true },
    color: { type: String, default: "#262626" },
    logoUrl: { type: String },
    greeting: { type: String, default: "Send a chat to get started." },
    language: { type: String, default: "en" },
    systemPrompt: { type: String },
    model: { type: String, default: "gemini-1.5-flash" },
    temperature: { type: Number, default: 0.7 },
  },
  { timestamps: true }
);

export const Workspace = model<IWorkspace>("Workspace", WorkspaceSchema);
