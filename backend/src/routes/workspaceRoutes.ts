import { Router } from "express";
import { workspaceController } from "../controllers/WorkspaceController";
import { authenticateJWT } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";

const router = Router();

// Apply auth to all workspace routes
router.use(authenticateJWT);

// Workspace base routes
router.post("/", workspaceController.create);
router.get("/", workspaceController.list);

// Workspace ID scoped routes
router.get("/:id", requireRole(["OWNER", "ADMIN", "AGENT"]), workspaceController.get);
router.put("/:id", requireRole(["OWNER", "ADMIN"]), workspaceController.update);
router.delete("/:id", requireRole(["OWNER"]), workspaceController.delete);

// Team members management routes
router.post("/:id/members", requireRole(["OWNER", "ADMIN"]), workspaceController.addMember);
router.get("/:id/members", requireRole(["OWNER", "ADMIN", "AGENT"]), workspaceController.listMembers);
router.delete("/:id/members/:memberId", requireRole(["OWNER", "ADMIN"]), workspaceController.removeMember);

export default router;
