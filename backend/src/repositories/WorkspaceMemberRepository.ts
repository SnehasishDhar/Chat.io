import { WorkspaceMember, IWorkspaceMember, WorkspaceRole } from "../models/WorkspaceMember";
import { Types } from "mongoose";

export class WorkspaceMemberRepository {
  async findMember(workspaceId: string, userId: string): Promise<IWorkspaceMember | null> {
    return WorkspaceMember.findOne({
      workspaceId: new Types.ObjectId(workspaceId),
      userId: new Types.ObjectId(userId),
    });
  }

  async findByWorkspace(workspaceId: string): Promise<IWorkspaceMember[]> {
    return WorkspaceMember.find({ workspaceId: new Types.ObjectId(workspaceId) }).populate("userId", "firstName lastName email");
  }

  async findByUserId(userId: string): Promise<IWorkspaceMember[]> {
    return WorkspaceMember.find({ userId: new Types.ObjectId(userId) }).populate("workspaceId");
  }

  async create(memberData: Partial<IWorkspaceMember>): Promise<IWorkspaceMember> {
    const member = new WorkspaceMember(memberData);
    return member.save();
  }

  async delete(workspaceId: string, userId: string): Promise<IWorkspaceMember | null> {
    return WorkspaceMember.findOneAndDelete({
      workspaceId: new Types.ObjectId(workspaceId),
      userId: new Types.ObjectId(userId),
    });
  }

  async deleteByWorkspace(workspaceId: string): Promise<any> {
    return WorkspaceMember.deleteMany({ workspaceId: new Types.ObjectId(workspaceId) });
  }
}

export const workspaceMemberRepository = new WorkspaceMemberRepository();
