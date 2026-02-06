import cors from "cors";
import express from "express";
import { createSupabaseJwtVerifier } from "./auth/supabaseJwt.js";
import { getConfigFromEnv, type AppConfig } from "./config.js";
import { requireAuth, type VerifyAccessToken } from "./middleware/requireAuth.js";
import { requireUserContext } from "./middleware/requireUserContext.js";
import { createDocsRouter } from "./routes/docs.js";
import { createConversationsRouter } from "./routes/conversations.js";
import { healthRouter } from "./routes/health.js";
import { createMeRouter } from "./routes/me.js";
import { createScheduleRouter } from "./routes/schedule.js";

export function createApp({
  config,
  verifyAccessToken,
  fetchImpl,
}: {
  config?: AppConfig;
  verifyAccessToken?: VerifyAccessToken;
  fetchImpl?: typeof fetch;
} = {}) {
  const app = express();
  const resolvedConfig = config ?? getConfigFromEnv();
  const resolvedVerifyAccessToken =
    verifyAccessToken ??
    (resolvedConfig.supabaseUrl
      ? createSupabaseJwtVerifier({ supabaseUrl: resolvedConfig.supabaseUrl })
      : async () => {
          throw new Error("Missing SUPABASE_URL");
        });

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.use("/api/health", healthRouter);
  app.use(
    "/api/me",
    requireAuth(resolvedVerifyAccessToken),
    requireUserContext({ ...resolvedConfig, fetchImpl }),
    createMeRouter()
  );
  app.use(
    "/api/docs",
    requireAuth(resolvedVerifyAccessToken),
    requireUserContext({ ...resolvedConfig, fetchImpl }),
    createDocsRouter({ ...resolvedConfig, fetchImpl })
  );
  app.use(
    "/api/conversations",
    requireAuth(resolvedVerifyAccessToken),
    requireUserContext({ ...resolvedConfig, fetchImpl }),
    createConversationsRouter({ ...resolvedConfig, fetchImpl })
  );
  app.use(
    "/api/schedule",
    requireAuth(resolvedVerifyAccessToken),
    requireUserContext({ ...resolvedConfig, fetchImpl }),
    createScheduleRouter({ ...resolvedConfig, fetchImpl })
  );

  app.use((req, res) => {
    res.status(404).json({
      ok: false,
      error: { code: "NOT_FOUND", message: "Route not found" },
    });
  });

  app.use(
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      void _next;
      console.error(err);
      res.status(500).json({
        ok: false,
        error: { code: "INTERNAL", message: "Unexpected server error" },
      });
    }
  );

  return app;
}
