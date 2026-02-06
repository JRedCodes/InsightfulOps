import { Router } from "express";
import { z } from "zod";
import { ok, err } from "../http/response";
import { requireRole } from "../middleware/requireRole";
import {
  fetchDocumentById,
  fetchVisibleDocuments,
  updateDocumentStatus,
} from "../supabase/postgrest";

export function createDocsRouter({
  supabaseUrl,
  supabaseAnonKey,
  fetchImpl,
}: {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  fetchImpl?: typeof fetch;
}) {
  const router = Router();

  router.get("/", async (req, res) => {
    const accessToken = req.auth?.accessToken;

    if (!accessToken) {
      return res.status(500).json(
        err({
          code: "INTERNAL",
          message: "Auth context missing on request",
        })
      );
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json(
        err({
          code: "SERVER_MISCONFIGURED",
          message: "Missing SUPABASE_URL or SUPABASE_ANON_KEY",
        })
      );
    }

    const docs = await fetchVisibleDocuments({
      supabaseUrl,
      supabaseAnonKey,
      accessToken,
      fetchImpl,
    });

    return res.json(ok({ docs }));
  });

  router.get("/:id", async (req, res) => {
    const accessToken = req.auth?.accessToken;
    if (!accessToken) {
      return res
        .status(500)
        .json(err({ code: "INTERNAL", message: "Auth context missing on request" }));
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json(
        err({
          code: "SERVER_MISCONFIGURED",
          message: "Missing SUPABASE_URL or SUPABASE_ANON_KEY",
        })
      );
    }

    const parsedId = z.string().uuid().safeParse(req.params.id);
    if (!parsedId.success) {
      return res.status(400).json(err({ code: "BAD_REQUEST", message: "Invalid doc id" }));
    }

    const doc = await fetchDocumentById({
      supabaseUrl,
      supabaseAnonKey,
      accessToken,
      docId: parsedId.data,
      fetchImpl,
    });

    if (!doc) {
      return res.status(404).json(err({ code: "NOT_FOUND", message: "Document not found" }));
    }

    return res.json(ok({ doc }));
  });

  router.post("/:id/reindex", requireRole(["admin"]), async (req, res) => {
    const accessToken = req.auth?.accessToken;
    if (!accessToken) {
      return res
        .status(500)
        .json(err({ code: "INTERNAL", message: "Auth context missing on request" }));
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json(
        err({
          code: "SERVER_MISCONFIGURED",
          message: "Missing SUPABASE_URL or SUPABASE_ANON_KEY",
        })
      );
    }

    const parsedId = z.string().uuid().safeParse(req.params.id);
    if (!parsedId.success) {
      return res.status(400).json(err({ code: "BAD_REQUEST", message: "Invalid doc id" }));
    }

    const doc = await updateDocumentStatus({
      supabaseUrl,
      supabaseAnonKey,
      accessToken,
      docId: parsedId.data,
      status: "processing",
      fetchImpl,
    });

    if (!doc) {
      return res.status(404).json(err({ code: "NOT_FOUND", message: "Document not found" }));
    }

    return res.json(ok({ doc }));
  });

  router.delete("/:id", requireRole(["admin"]), async (req, res) => {
    const accessToken = req.auth?.accessToken;
    if (!accessToken) {
      return res
        .status(500)
        .json(err({ code: "INTERNAL", message: "Auth context missing on request" }));
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json(
        err({
          code: "SERVER_MISCONFIGURED",
          message: "Missing SUPABASE_URL or SUPABASE_ANON_KEY",
        })
      );
    }

    const parsedId = z.string().uuid().safeParse(req.params.id);
    if (!parsedId.success) {
      return res.status(400).json(err({ code: "BAD_REQUEST", message: "Invalid doc id" }));
    }

    const doc = await updateDocumentStatus({
      supabaseUrl,
      supabaseAnonKey,
      accessToken,
      docId: parsedId.data,
      status: "archived",
      fetchImpl,
    });

    if (!doc) {
      return res.status(404).json(err({ code: "NOT_FOUND", message: "Document not found" }));
    }

    return res.json(ok({ doc }));
  });

  return router;
}
