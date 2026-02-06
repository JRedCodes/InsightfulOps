import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ok, err } from "../http/response";
import { requireRole } from "../middleware/requireRole";
import {
  createDocument,
  fetchDocumentById,
  fetchVisibleDocuments,
  updateDocumentStatus,
} from "../supabase/postgrest";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
  },
});

function sanitizeFilename(filename: string) {
  const base = path.basename(filename);
  return base.replace(/[^\w.-]+/g, "_");
}

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

  router.post("/", requireRole(["admin"]), upload.single("file"), async (req, res) => {
    const accessToken = req.auth?.accessToken;
    const companyId = req.userContext?.companyId;
    const userId = req.userContext?.userId;
    if (!accessToken || !companyId || !userId) {
      return res
        .status(500)
        .json(err({ code: "INTERNAL", message: "User context missing on request" }));
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json(
        err({
          code: "SERVER_MISCONFIGURED",
          message: "Missing SUPABASE_URL or SUPABASE_ANON_KEY",
        })
      );
    }

    const file = req.file;
    if (!file) {
      return res
        .status(400)
        .json(err({ code: "BAD_REQUEST", message: "Missing multipart file field: file" }));
    }

    const visibility = req.body?.visibility;
    if (visibility !== "employee" && visibility !== "manager" && visibility !== "admin") {
      return res.status(400).json(err({ code: "BAD_REQUEST", message: "Invalid visibility" }));
    }

    const title =
      typeof req.body?.title === "string" && req.body.title.trim().length > 0
        ? req.body.title.trim()
        : file.originalname;

    const docId = randomUUID();
    const filePath = `${companyId}/${docId}/${sanitizeFilename(file.originalname)}`;

    // MVP stub: we are not uploading to Storage or enqueueing ingestion yet.
    const doc = await createDocument({
      supabaseUrl,
      supabaseAnonKey,
      accessToken,
      document: {
        id: docId,
        company_id: companyId,
        title,
        file_path: filePath,
        visibility,
        status: "processing",
        created_by: userId,
      },
      fetchImpl,
    });

    return res.status(201).json(ok({ doc }));
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
