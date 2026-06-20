import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest } from "../types";

export function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Access token required" });
  }

  const token = authHeader.split(" ")[1];
  const secret = process.env.JWT_ACCESS_SECRET || "default_access_secret_123";

  try {
    const decoded = jwt.verify(token, secret) as { userId: string; email: string };
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };
    return next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired access token" });
  }
}
