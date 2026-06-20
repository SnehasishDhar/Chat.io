import { Router } from "express";
import { widgetController } from "../controllers/WidgetController";

const router = Router();

// Public routes for embedding script widgets
router.get("/:embedId/config", widgetController.getConfig);
router.get("/:embedId/:sessionId/messages", widgetController.getMessages);
router.delete("/:embedId/:sessionId", widgetController.resetSession);
router.post("/:embedId/chat", widgetController.chat);
router.post("/:embedId/stream-chat", widgetController.streamChat);

export default router;
