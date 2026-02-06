import type { SupabaseAuthClaims } from "../auth/supabaseJwt";
import type { UserContext } from "../middleware/requireUserContext";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        accessToken: string;
        claims: SupabaseAuthClaims;
      };
      userContext?: UserContext;
    }
  }
}

export {};
