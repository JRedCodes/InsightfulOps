import type { SupabaseAuthClaims } from "../auth/supabaseJwt";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        accessToken: string;
        claims: SupabaseAuthClaims;
      };
    }
  }
}

export {};
