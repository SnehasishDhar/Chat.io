import { workspaceRepository } from "../repositories/WorkspaceRepository";
import { workspaceMemberRepository } from "../repositories/WorkspaceMemberRepository";
import { IWorkspace } from "../models/Workspace";
import { IWorkspaceMember, WorkspaceRole } from "../models/WorkspaceMember";
import { v4 as uuidv4 } from "uuid";
import { Types } from "mongoose";

export class WorkspaceService {
  async createWorkspace(
    name: string,
    description: string,
    ownerId: string
  ): Promise<{ workspace: IWorkspace; member: IWorkspaceMember }> {
    const embedId = uuidv4();
    const workspace = await workspaceRepository.create({
      name,
      description,
      ownerId: new Types.ObjectId(ownerId),
      embedId,
    });

    const member = await workspaceMemberRepository.create({
      workspaceId: workspace._id as Types.ObjectId,
      userId: new Types.ObjectId(ownerId),
      role: "OWNER",
    });

    return { workspace, member };
  }

  async getWorkspaceDetails(id: string): Promise<IWorkspace | null> {
    return workspaceRepository.findById(id);
  }

  async getWorkspaceByEmbedId(embedId: string): Promise<IWorkspace | null> {
    return workspaceRepository.findByEmbedId(embedId);
  }

  async listUserWorkspaces(userId: string): Promise<IWorkspace[]> {
    // Get all memberships for the user
    const memberships = await workspaceMemberRepository.findByUserId(userId);
    // Extract workspaces
    const workspaces: IWorkspace[] = [];
    for (const membership of memberships) {
      if (membership.workspaceId) {
        workspaces.push(membership.workspaceId as unknown as IWorkspace);
      }
    }
    return workspaces;
  }

  async updateWorkspace(id: string, updateData: Partial<IWorkspace>): Promise<IWorkspace | null> {
    // Prevent updating index/immutable keys
    delete (updateData as any).ownerId;
    delete (updateData as any).embedId;
    
    return workspaceRepository.update(id, updateData);
  }

  async deleteWorkspace(id: string): Promise<void> {
    await workspaceRepository.delete(id);
    await workspaceMemberRepository.deleteByWorkspace(id);
  }

  // --- Team / Member Management ---
  async inviteMember(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
    invitedById: string
  ): Promise<IWorkspaceMember> {
    return workspaceMemberRepository.create({
      workspaceId: new Types.ObjectId(workspaceId),
      userId: new Types.ObjectId(userId),
      role,
      invitedBy: new Types.ObjectId(invitedById),
    });
  }

  async listMembers(workspaceId: string): Promise<IWorkspaceMember[]> {
    return workspaceMemberRepository.findByWorkspace(workspaceId);
  }

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    await workspaceMemberRepository.delete(workspaceId, userId);
  }

  async checkUserRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null> {
    const member = await workspaceMemberRepository.findMember(workspaceId, userId);
    return member ? member.role : null;
  }
}

export const workspaceService = new WorkspaceService();
