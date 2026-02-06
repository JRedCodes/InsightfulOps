import type { NextFunction, Request, Response } from "express";
import { err } from "../http/response";
import type { UserContext } from "./requireUserContext";

export function requireRole(allowed: UserContext["role"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.userContext?.role;
    if (!role) {
      return res.status(500).json(
        err({
          code: "INTERNAL",
          message: "User context missing on request",
        })
      );
    }

    if (!allowed.includes(role)) {
      return res.status(403).json(
        err({
          code: "FORBIDDEN",
          message: "Not authorized",
        })
      );
    }

    return next();
  };
}
