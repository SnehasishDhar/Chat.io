import { Response } from "express";
import { conversationRepository } from "../repositories/ConversationRepository";
import { messageRepository } from "../repositories/MessageRepository";
import { workspaceMemberRepository } from "../repositories/WorkspaceMemberRepository";
import { AuthenticatedRequest } from "../types";
import { Types } from "mongoose";

export class AgentController {
  /**
   * Helper to verify if the agent has access to a workspace
   */
  private async verifyWorkspaceAccess(userId: string, workspaceId: string): Promise<boolean> {
    const membership = await workspaceMemberRepository.findMember(workspaceId, userId);
    return !!membership;
  }

  async listConversations(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Find all workspaces this user belongs to
      const memberships = await workspaceMemberRepository.findByUserId(userId);
      const workspaceIds = memberships.map((m) => m.workspaceId.toString());

      if (workspaceIds.length === 0) {
        return res.json([]);
      }

      // If workspaceId is passed as query parameter, verify access and filter by it
      const filterWorkspaceId = req.query.workspaceId as string;
      if (filterWorkspaceId) {
        if (!workspaceIds.includes(filterWorkspaceId)) {
          return res.status(403).json({ error: "Forbidden: No access to this workspace" });
        }
        const status = req.query.status as string;
        let conversations;
        if (status) {
          conversations = await conversationRepository.findByStatus(filterWorkspaceId, [status as any]);
        } else {
          conversations = await conversationRepository.findByWorkspace(filterWorkspaceId);
        }
        return res.json(conversations);
      }

      // Otherwise, return all conversations across all of the agent's authorized workspaces
      const statusFilter = req.query.status as string;
      const statuses = statusFilter
        ? [statusFilter as any]
        : ["BOT", "WAITING_FOR_AGENT", "HUMAN_ACTIVE", "CLOSED"];
      
      const allConversations = await conversationRepository.findAllByStatuses(statuses);
      // Filter memory-wise based on authorized workspaces
      const filtered = allConversations.filter((c) => workspaceIds.includes(c.workspaceId.toString()));

      return res.json(filtered);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getConversation(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const conversation = await conversationRepository.findById(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Check tenant isolation access
      const hasAccess = await this.verifyWorkspaceAccess(userId, conversation.workspaceId.toString());
      if (!hasAccess) {
        return res.status(403).json({ error: "Forbidden: No access to this workspace conversation" });
      }

      const messages = await messageRepository.findByConversation(id);
      return res.json({
        conversation,
        messages,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async assign(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const conversation = await conversationRepository.findById(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const hasAccess = await this.verifyWorkspaceAccess(userId, conversation.workspaceId.toString());
      if (!hasAccess) {
        return res.status(403).json({ error: "Forbidden: No access to this workspace conversation" });
      }

      const updated = await conversationRepository.assignAgent(id, userId);
      return res.json(updated);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async close(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const conversation = await conversationRepository.findById(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const hasAccess = await this.verifyWorkspaceAccess(userId, conversation.workspaceId.toString());
      if (!hasAccess) {
        return res.status(403).json({ error: "Forbidden: No access to this workspace conversation" });
      }

      const updated = await conversationRepository.updateStatus(id, "CLOSED");
      return res.json(updated);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}

export const agentController = new AgentController();
