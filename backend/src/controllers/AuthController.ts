import { Response } from "express";
import { authService } from "../services/AuthService";
import { RegisterSchema, LoginSchema } from "../validators";
import { AuthenticatedRequest } from "../types";
import { userRepository } from "../repositories/UserRepository";

export class AuthController {
  async register(req: AuthenticatedRequest, res: Response) {
    try {
      const validated = RegisterSchema.parse(req.body);
      const result = await authService.register(
        validated.email,
        validated.password,
        validated.firstName,
        validated.lastName
      );
      
      // Cookie or payload refresh token
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      return res.status(201).json({
        user: {
          id: result.user._id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: error.errors });
      }
      return res.status(400).json({ error: error.message });
    }
  }

  async login(req: AuthenticatedRequest, res: Response) {
    try {
      const validated = LoginSchema.parse(req.body);
      const result = await authService.login(validated.email, validated.password);

      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      return res.json({
        user: {
          id: result.user._id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: error.errors });
      }
      return res.status(401).json({ error: error.message });
    }
  }

  async refresh(req: AuthenticatedRequest, res: Response) {
    const token = req.body.refreshToken || req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ error: "Refresh token is required" });
    }

    try {
      const result = await authService.refresh(token);
      return res.json(result);
    } catch (error: any) {
      return res.status(401).json({ error: error.message });
    }
  }

  async logout(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (userId) {
        await authService.logout(userId);
      }
      res.clearCookie("refreshToken");
      return res.json({ message: "Successfully logged out" });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async me(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await userRepository.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.json({
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}

export const authController = new AuthController();
