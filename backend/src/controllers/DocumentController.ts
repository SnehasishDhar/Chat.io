import { Response } from "express";
import { documentService } from "../services/DocumentService";
import { documentRepository } from "../repositories/DocumentRepository";
import { workspaceService } from "../services/WorkspaceService";
import { AuthenticatedRequest } from "../types";

export class DocumentController {
  async uploadDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params; // workspace ID
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No document file uploaded" });
      }

      // Check RBAC: only OWNER and ADMIN can upload files to a workspace
      const userRole = req.memberRole;
      if (userRole !== "OWNER" && userRole !== "ADMIN") {
        return res.status(403).json({ error: "Forbidden: Only owners and admins can upload documents" });
      }

      const userId = req.user?.userId;

      const doc = await documentService.processDocument(
        id,
        file.originalname,
        file.mimetype,
        file.size,
        file.path,
        userId
      );

      return res.status(201).json(doc);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async listDocuments(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params; // workspace ID
      const docs = await documentService.listDocuments(id);
      return res.json(docs);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async deleteDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params; // document ID
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get document to find workspace ID
      const doc = await documentRepository.findById(id);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Check user permissions in the document's workspace
      const userRole = await workspaceService.checkUserRole(doc.workspaceId.toString(), userId);
      if (userRole !== "OWNER" && userRole !== "ADMIN") {
        return res.status(403).json({ 
          error: "Forbidden: Only workspace owners and admins can delete documents" 
        });
      }

      await documentService.deleteDocument(id);
      return res.json({ message: "Document deleted and chunks purged successfully" });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}

export const documentController = new DocumentController();
