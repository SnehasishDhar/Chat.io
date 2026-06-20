import { Response } from "express";
import { workspaceService } from "../services/WorkspaceService";
import { userRepository } from "../repositories/UserRepository";
import { WorkspaceSchema, WorkspaceUpdateSchema, AddMemberSchema } from "../validators";
import { AuthenticatedRequest } from "../types";

export class WorkspaceController {
  async create(req: AuthenticatedRequest, res: Response) {
    try {
      const validated = WorkspaceSchema.parse(req.body);
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const result = await workspaceService.createWorkspace(
        validated.name,
        validated.description || "",
        userId
      );

      return res.status(201).json(result.workspace);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: error.errors });
      }
      return res.status(400).json({ error: error.message });
    }
  }

  async list(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const workspaces = await workspaceService.listUserWorkspaces(userId);
      return res.json(workspaces);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async get(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const workspace = await workspaceService.getWorkspaceDetails(id);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found" });
      }
      return res.json(workspace);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async update(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const validated = WorkspaceUpdateSchema.parse(req.body);
      
      // RBAC validation: only OWNER and ADMIN can update workspace configurations
      const userRole = req.memberRole;
      if (userRole !== "OWNER" && userRole !== "ADMIN") {
        return res.status(403).json({ error: "Forbidden: Only owners and admins can configure workspaces" });
      }

      const updated = await workspaceService.updateWorkspace(id, validated);
      if (!updated) {
        return res.status(404).json({ error: "Workspace not found" });
      }
      return res.json(updated);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: error.errors });
      }
      return res.status(400).json({ error: error.message });
    }
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      // Only OWNER can delete workspace
      const userRole = req.memberRole;
      if (userRole !== "OWNER") {
        return res.status(403).json({ error: "Forbidden: Only the workspace owner can delete the workspace" });
      }

      await workspaceService.deleteWorkspace(id);
      return res.json({ message: "Workspace deleted successfully" });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // --- Team Management ---
  async addMember(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params; // workspace ID
      const validated = AddMemberSchema.parse(req.body);
      const invitedById = req.user?.userId;

      if (!invitedById) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Check permissions: only OWNER or ADMIN can add member
      const userRole = req.memberRole;
      if (userRole !== "OWNER" && userRole !== "ADMIN") {
        return res.status(403).json({ error: "Forbidden: Only owners and admins can invite members" });
      }

      // Lookup target user by email
      const targetUser = await userRepository.findByEmail(validated.email);
      if (!targetUser) {
        return res.status(404).json({ error: "User with this email not registered on platform" });
      }

      const member = await workspaceService.inviteMember(
        id,
        targetUser._id.toString(),
        validated.role,
        invitedById
      );

      return res.status(201).json(member);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: error.errors });
      }
      return res.status(400).json({ error: error.message });
    }
  }

  async listMembers(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params; // workspace ID
      const members = await workspaceService.listMembers(id);
      return res.json(members);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async removeMember(req: AuthenticatedRequest, res: Response) {
    try {
      const { id, memberId } = req.params; // id = workspaceId, memberId = userId to remove
      
      const userRole = req.memberRole;
      if (userRole !== "OWNER" && userRole !== "ADMIN") {
        return res.status(403).json({ error: "Forbidden: Only owners and admins can remove members" });
      }

      // Fetch member to verify they are not the owner
      const targetMemberRole = await workspaceService.checkUserRole(id, memberId);
      if (targetMemberRole === "OWNER") {
        return res.status(400).json({ error: "Cannot remove workspace owner" });
      }

      await workspaceService.removeMember(id, memberId);
      return res.json({ message: "Member removed successfully" });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}

export const workspaceController = new WorkspaceController();
