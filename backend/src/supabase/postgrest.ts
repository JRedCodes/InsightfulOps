import { z } from "zod";

const profileSchema = z.object({
  user_id: z.string().uuid(),
  company_id: z.string().uuid(),
  email: z.string().email().nullable().optional(),
  role: z.enum(["employee", "manager", "admin"]),
});

export type ProfileRow = z.infer<typeof profileSchema>;

const docVisibilitySchema = z.enum(["employee", "manager", "admin"]);
const docStatusSchema = z.enum(["processing", "indexed", "failed", "archived"]);

const documentSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  visibility: docVisibilitySchema,
  status: docStatusSchema,
  created_at: z.string(),
});

export type DocumentRow = z.infer<typeof documentSchema>;

export async function fetchMyProfile({
  supabaseUrl,
  supabaseAnonKey,
  accessToken,
  userId,
  fetchImpl,
}: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  accessToken: string;
  userId: string;
  fetchImpl?: typeof fetch;
}): Promise<ProfileRow | null> {
  const f = fetchImpl ?? fetch;
  const url = new URL("/rest/v1/profiles", supabaseUrl);
  url.searchParams.set("select", "user_id,company_id,email,role");
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("limit", "1");

  const res = await f(url.toString(), {
    method: "GET",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase PostgREST error ${res.status}: ${text}`);
  }

  const json = await res.json();
  const rows = z.array(profileSchema).parse(json);
  return rows[0] ?? null;
}

export async function fetchVisibleDocuments({
  supabaseUrl,
  supabaseAnonKey,
  accessToken,
  limit = 25,
  fetchImpl,
}: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  accessToken: string;
  limit?: number;
  fetchImpl?: typeof fetch;
}): Promise<DocumentRow[]> {
  const f = fetchImpl ?? fetch;
  const url = new URL("/rest/v1/documents", supabaseUrl);
  url.searchParams.set("select", "id,title,visibility,status,created_at");
  url.searchParams.set("order", "created_at.desc");
  url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 100)));

  const res = await f(url.toString(), {
    method: "GET",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase PostgREST error ${res.status}: ${text}`);
  }

  const json = await res.json();
  return z.array(documentSchema).parse(json);
}
