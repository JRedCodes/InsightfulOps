import type { NextFunction, Request, Response } from "express";
import { err } from "../http/response";
import type { SupabaseAuthClaims } from "../auth/supabaseJwt";

export type VerifyAccessToken = (accessToken: string) => Promise<SupabaseAuthClaims>;

function getBearerToken(req: Request): string | null {
  const header = req.header("authorization") ?? req.header("Authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export function requireAuth(verifyAccessToken: VerifyAccessToken) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const accessToken = getBearerToken(req);
      if (!accessToken) {
        return res.status(401).json(
          err({
            code: "UNAUTHENTICATED",
            message: "Missing Authorization: Bearer <token>",
          })
        );
      }

      const claims = await verifyAccessToken(accessToken);
      req.auth = { accessToken, claims };
      return next();
    } catch {
      return res.status(401).json(
        err({
          code: "UNAUTHENTICATED",
          message: "Invalid or expired token",
        })
      );
    }
  };
}
