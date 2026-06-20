import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types";
import { workspaceService } from "../services/WorkspaceService";

export function requireRole(allowedRoles: ("OWNER" | "ADMIN" | "AGENT")[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      // Get workspaceId from params: typically named 'workspaceId' or 'id'
      const workspaceId = req.params.workspaceId || req.params.id;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!workspaceId) {
        return res.status(400).json({ error: "Workspace ID context is missing in request params" });
      }

      const role = await workspaceService.checkUserRole(workspaceId, userId);
      
      if (!role || !allowedRoles.includes(role)) {
        return res.status(403).json({ 
          error: "Forbidden: insufficient permissions or not a member of this workspace" 
        });
      }

      req.memberRole = role;
      return next();
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  };
}
