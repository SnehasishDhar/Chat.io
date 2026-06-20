import { Workspace, IWorkspace } from "../models/Workspace";

export class WorkspaceRepository {
  async findById(id: string): Promise<IWorkspace | null> {
    return Workspace.findById(id);
  }

  async findByEmbedId(embedId: string): Promise<IWorkspace | null> {
    return Workspace.findOne({ embedId });
  }

  async findByOwner(ownerId: string): Promise<IWorkspace[]> {
    return Workspace.find({ ownerId });
  }

  async create(workspaceData: Partial<IWorkspace>): Promise<IWorkspace> {
    const workspace = new Workspace(workspaceData);
    return workspace.save();
  }

  async update(id: string, updateData: Partial<IWorkspace>): Promise<IWorkspace | null> {
    return Workspace.findByIdAndUpdate(id, { $set: updateData }, { new: true });
  }

  async delete(id: string): Promise<IWorkspace | null> {
    return Workspace.findByIdAndDelete(id);
  }
}

export const workspaceRepository = new WorkspaceRepository();
