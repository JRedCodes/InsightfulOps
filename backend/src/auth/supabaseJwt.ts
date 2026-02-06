import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

export type SupabaseAuthClaims = JWTPayload & {
  sub: string;
  email?: string;
  role?: string;
};

export function getSupabaseJwksUrl(supabaseUrl: string) {
  return new URL("/auth/v1/.well-known/jwks.json", supabaseUrl);
}

export function getSupabaseIssuer(supabaseUrl: string) {
  // Supabase JWTs commonly set `iss` to `${SUPABASE_URL}/auth/v1`.
  return new URL("/auth/v1", supabaseUrl).toString();
}

export function createSupabaseJwtVerifier({
  supabaseUrl,
}: {
  supabaseUrl: string;
}): (accessToken: string) => Promise<SupabaseAuthClaims> {
  const jwksUrl = getSupabaseJwksUrl(supabaseUrl);
  const jwks = createRemoteJWKSet(jwksUrl);
  const issuer = getSupabaseIssuer(supabaseUrl);

  return async (accessToken: string) => {
    const { payload } = await jwtVerify(accessToken, jwks, {
      issuer,
    });

    // Enforce `sub` for our app context
    if (!payload.sub) throw new Error("JWT missing sub claim");
    return payload as SupabaseAuthClaims;
  };
}
