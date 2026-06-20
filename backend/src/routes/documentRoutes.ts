import { Router } from "express";
import { documentController } from "../controllers/DocumentController";
import { authenticateJWT } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { upload } from "../middleware/upload";

const router = Router();

// Apply auth to all document routes
router.use(authenticateJWT);

// Delete document (requires RBAC checked dynamically inside controller handler)
router.delete("/:id", documentController.deleteDocument);

// Workspace specific uploads (mapped via workspace ID)
// These endpoints will be linked in the main app routing under /api/workspaces/:id/documents
export const workspaceDocumentRouter = Router({ mergeParams: true });
workspaceDocumentRouter.post(
  "/",
  requireRole(["OWNER", "ADMIN"]),
  upload.single("file"),
  documentController.uploadDocument
);
workspaceDocumentRouter.get(
  "/",
  requireRole(["OWNER", "ADMIN", "AGENT"]),
  documentController.listDocuments
);

export default router;
