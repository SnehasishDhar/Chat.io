import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
  memberRole?: "OWNER" | "ADMIN" | "AGENT";
}
