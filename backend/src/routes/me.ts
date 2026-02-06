import { Router } from "express";
import { ok, err } from "../http/response";

export function createMeRouter() {
  const router = Router();

  router.get("/", async (req, res) => {
    if (!req.userContext) {
      return res.status(500).json(
        err({
          code: "INTERNAL",
          message: "User context missing on request",
        })
      );
    }

    return res.json(
      ok({
        user: {
          id: req.userContext.userId,
          email: req.userContext.email,
          role: req.userContext.role,
          company_id: req.userContext.companyId,
        },
      })
    );
  });

  return router;
}
