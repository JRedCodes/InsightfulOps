import { Router } from "express";
import { z } from "zod";
import { err, ok } from "../http/response";
import {
  createAssistantFeedback,
  createConversation,
  createMessage,
  matchChunks,
} from "../supabase/postgrest";
import { openaiEmbedTexts } from "../llm/openaiEmbeddings.js";
import { openaiAnswerWithSources } from "../llm/openaiChat.js";

const bodySchema = z.object({
  conversation_id: z.string().uuid().nullable().optional(),
  message: z.string().min(1).max(10_000),
  context: z
    .object({
      module: z.string().optional(),
      page: z.string().optional(),
    })
    .optional(),
});

const feedbackSchema = z.object({
  message_id: z.string().uuid(),
  rating: z.enum(["up", "down"]),
  comment: z.string().max(2000).optional(),
});

export function createAssistantRouter({
  supabaseUrl,
  supabaseAnonKey,
  openaiApiKey,
  fetchImpl,
}: {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  openaiApiKey?: string;
  fetchImpl?: typeof fetch;
}) {
  const router = Router();

  router.post("/chat", async (req, res) => {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(err({ code: "BAD_REQUEST", message: "Invalid request body" }));
    }

    const accessToken = req.auth?.accessToken;
    const userId = req.userContext?.userId;
    const companyId = req.userContext?.companyId;
    if (!accessToken || !userId || !companyId) {
      return res
        .status(500)
        .json(err({ code: "INTERNAL", message: "User context missing on request" }));
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      return res
        .status(500)
        .json(err({ code: "SERVER_MISCONFIGURED", message: "Missing Supabase config" }));
    }

    const openaiKey = openaiApiKey ?? process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      const assistantText =
        "Assistant retrieval is available, but this server is missing OPENAI_API_KEY. " +
        "Set OPENAI_API_KEY to enable answers with citations.";

      const conversationId =
        parsed.data.conversation_id ??
        (
          await createConversation({
            supabaseUrl,
            supabaseAnonKey,
            accessToken,
            conversation: {
              company_id: companyId,
              created_by: userId,
              title: null,
            },
            fetchImpl,
          })
        ).id;

      await createMessage({
        supabaseUrl,
        supabaseAnonKey,
        accessToken,
        message: {
          company_id: companyId,
          conversation_id: conversationId,
          sender: "user",
          content: parsed.data.message,
          confidence: null,
          no_sufficient_sources: false,
          needs_admin_review: false,
        },
        fetchImpl,
      });

      const assistantMessage = await createMessage({
        supabaseUrl,
        supabaseAnonKey,
        accessToken,
        message: {
          company_id: companyId,
          conversation_id: conversationId,
          sender: "assistant",
          content: assistantText,
          confidence: null,
          no_sufficient_sources: true,
          needs_admin_review: false,
        },
        fetchImpl,
      });

      return res.json(
        ok({
          conversation_id: conversationId,
          assistant_message: {
            id: assistantMessage.id,
            text: assistantMessage.content,
            confidence: assistantMessage.confidence ?? null,
            citations: [],
          },
          flags: {
            needs_admin_review: assistantMessage.needs_admin_review ?? false,
            no_sufficient_sources: assistantMessage.no_sufficient_sources ?? true,
          },
        })
      );
    }

    const conversationId =
      parsed.data.conversation_id ??
      (
        await createConversation({
          supabaseUrl,
          supabaseAnonKey,
          accessToken,
          conversation: {
            company_id: companyId,
            created_by: userId,
            title: null,
          },
          fetchImpl,
        })
      ).id;

    // Persist user message + assistant reply (RLS owner-only).
    await createMessage({
      supabaseUrl,
      supabaseAnonKey,
      accessToken,
      message: {
        company_id: companyId,
        conversation_id: conversationId,
        sender: "user",
        content: parsed.data.message,
        confidence: null,
        no_sufficient_sources: false,
        needs_admin_review: false,
      },
      fetchImpl,
    });

    // Retrieve relevant chunks using RLS-enforced match_chunks.
    const [queryEmbedding] = await openaiEmbedTexts({
      apiKey: openaiKey,
      inputs: [parsed.data.message],
      fetchImpl,
    });
    const matches = queryEmbedding
      ? await matchChunks({
          supabaseUrl,
          supabaseAnonKey,
          accessToken,
          embedding: queryEmbedding,
          matchCount: 6,
          fetchImpl,
        })
      : [];

    const citations = matches.map((m) => ({
      document_id: m.document_id,
      chunk_id: m.chunk_id,
      title: m.title,
      similarity: m.similarity,
      excerpt: m.content.slice(0, 240),
    }));

    const assistantText =
      matches.length === 0
        ? "I don’t have sufficient sources in your company docs to answer that."
        : await openaiAnswerWithSources({
            apiKey: openaiKey,
            question: parsed.data.message,
            sources: matches.map((m) => ({ title: m.title, content: m.content })),
            fetchImpl,
          });

    const assistantMessage = await createMessage({
      supabaseUrl,
      supabaseAnonKey,
      accessToken,
      message: {
        company_id: companyId,
        conversation_id: conversationId,
        sender: "assistant",
        content: assistantText,
        confidence: null,
        no_sufficient_sources: matches.length === 0,
        needs_admin_review: false,
      },
      fetchImpl,
    });

    return res.json(
      ok({
        conversation_id: conversationId,
        assistant_message: {
          id: assistantMessage.id,
          text: assistantMessage.content,
          confidence: assistantMessage.confidence ?? null,
          citations,
        },
        flags: {
          needs_admin_review: assistantMessage.needs_admin_review ?? false,
          no_sufficient_sources: assistantMessage.no_sufficient_sources ?? matches.length === 0,
        },
      })
    );
  });

  router.post("/feedback", async (req, res) => {
    const parsed = feedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(err({ code: "BAD_REQUEST", message: "Invalid request body" }));
    }

    const accessToken = req.auth?.accessToken;
    const userId = req.userContext?.userId;
    const companyId = req.userContext?.companyId;
    if (!accessToken || !userId || !companyId) {
      return res
        .status(500)
        .json(err({ code: "INTERNAL", message: "User context missing on request" }));
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      return res
        .status(500)
        .json(err({ code: "SERVER_MISCONFIGURED", message: "Missing Supabase config" }));
    }

    const feedback = await createAssistantFeedback({
      supabaseUrl,
      supabaseAnonKey,
      accessToken,
      feedback: {
        company_id: companyId,
        message_id: parsed.data.message_id,
        user_id: userId,
        rating: parsed.data.rating,
        comment: parsed.data.comment ?? null,
      },
      fetchImpl,
    });

    return res.json(ok({ feedback }));
  });

  return router;
}
