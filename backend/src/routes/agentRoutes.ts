import { Router } from "express";
import { agentController } from "../controllers/AgentController";
import { authenticateJWT } from "../middleware/auth";

const router = Router();

// Apply auth to all agent dashboard routes
router.use(authenticateJWT);

router.get("/", agentController.listConversations);
router.get("/:id", agentController.getConversation);
router.post("/:id/assign", agentController.assign);
router.post("/:id/close", agentController.close);

export default router;
