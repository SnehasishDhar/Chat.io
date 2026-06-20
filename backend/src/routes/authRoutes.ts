import { Router } from "express";
import { authController } from "../controllers/AuthController";
import { authenticateJWT } from "../middleware/auth";

const router = Router();

// Public routes
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);

// Protected routes
router.post("/logout", authenticateJWT, authController.logout);
router.get("/me", authenticateJWT, authController.me);

export default router;
