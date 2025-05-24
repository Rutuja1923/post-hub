import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth-service";
import { usersTable } from "../db/schema";
import { UserRole, AuthenticatedUser } from "../types/auth";

type User = Omit<typeof usersTable.$inferSelect, "hashedPassword">;

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser | User | null;
    }
  }
}

export async function checkForAuthentication(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token =
    req.cookies?.token ||
    req.headers.authorization?.split(" ")[1] ||
    req.query.token;
  req.user = null;

  if (token) {
    const user = await AuthService.getUserFromToken(token);
    if (user) {
      req.user = user;
    }
  }
  console.log("User in checkForAuthentication:", req.user);
  return next();
}

export function restrictTo(roles: UserRole[]) {
  return function (req: Request, res: Response, next: NextFunction) {
    console.log("User in restrictTo:", req.user);

    if (!req.user) {
      res.status(401).json({ status: "error", message: "Unauthorized" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ status: "error", message: "Forbidden" });
      return;
    }

    return next();
  };
}
