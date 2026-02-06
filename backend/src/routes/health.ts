import { Router } from "express";
import { ok } from "../http/response";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json(ok({ status: "up" }));
});
