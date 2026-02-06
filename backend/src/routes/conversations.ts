import { Router } from "express";
import { z } from "zod";
import { err, ok } from "../http/response";
import { fetchConversationMessages, fetchConversations } from "../supabase/postgrest";

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export function createConversationsRouter({
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
      return res.status(500).json(err({ code: "INTERNAL", message: "Auth context missing" }));
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      return res
        .status(500)
        .json(err({ code: "SERVER_MISCONFIGURED", message: "Missing Supabase config" }));
    }

    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json(
        err({
          code: "BAD_REQUEST",
          message: "Invalid query parameters",
        })
      );
    }

    const conversations = await fetchConversations({
      supabaseUrl,
      supabaseAnonKey,
      accessToken,
      limit: parsed.data.limit ?? 25,
      fetchImpl,
    });

    return res.json(ok({ conversations }));
  });

  router.get("/:id", async (req, res) => {
    const accessToken = req.auth?.accessToken;
    if (!accessToken) {
      return res.status(500).json(err({ code: "INTERNAL", message: "Auth context missing" }));
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      return res
        .status(500)
        .json(err({ code: "SERVER_MISCONFIGURED", message: "Missing Supabase config" }));
    }

    const conversationId = req.params.id;
    if (!conversationId) {
      return res.status(400).json(err({ code: "BAD_REQUEST", message: "Missing id" }));
    }

    // With RLS owner-only policies, returning the messages is sufficient:
    // - if not owner, PostgREST returns empty array (or 401/403 depending on policy)
    const messages = await fetchConversationMessages({
      supabaseUrl,
      supabaseAnonKey,
      accessToken,
      conversationId,
      fetchImpl,
    });

    return res.json(ok({ conversation_id: conversationId, messages }));
  });

  return router;
}
