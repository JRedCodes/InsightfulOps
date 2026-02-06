import { z } from "zod";

const companySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

const profileSchema = z.object({
  user_id: z.string().uuid(),
  company_id: z.string().uuid(),
  role: z.enum(["employee", "manager", "admin"]),
  email: z.string().email().nullable().optional(),
});

export type CompanyRow = z.infer<typeof companySchema>;
export type ProfileRow = z.infer<typeof profileSchema>;

function adminHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  } as const;
}

export async function adminFetchProfileByUserId({
  supabaseUrl,
  serviceRoleKey,
  userId,
  fetchImpl,
}: {
  supabaseUrl: string;
  serviceRoleKey: string;
  userId: string;
  fetchImpl?: typeof fetch;
}): Promise<ProfileRow | null> {
  const f = fetchImpl ?? fetch;
  const url = new URL("/rest/v1/profiles", supabaseUrl);
  url.searchParams.set("select", "user_id,company_id,role,email");
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("limit", "1");

  const res = await f(url.toString(), { method: "GET", headers: adminHeaders(serviceRoleKey) });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase admin PostgREST error ${res.status}: ${text}`);
  }

  const json = await res.json();
  const rows = z.array(profileSchema).parse(json);
  return rows[0] ?? null;
}

export async function adminCreateCompany({
  supabaseUrl,
  serviceRoleKey,
  name,
  fetchImpl,
}: {
  supabaseUrl: string;
  serviceRoleKey: string;
  name: string;
  fetchImpl?: typeof fetch;
}): Promise<CompanyRow> {
  const f = fetchImpl ?? fetch;
  const url = new URL("/rest/v1/companies", supabaseUrl);
  url.searchParams.set("select", "id,name");

  const res = await f(url.toString(), {
    method: "POST",
    headers: {
      ...adminHeaders(serviceRoleKey),
      Prefer: "return=representation",
    },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase admin PostgREST error ${res.status}: ${text}`);
  }

  const json = await res.json();
  const rows = z.array(companySchema).parse(json);
  if (!rows[0]) throw new Error("Company insert returned no row");
  return rows[0];
}

export async function adminUpsertProfile({
  supabaseUrl,
  serviceRoleKey,
  profile,
  fetchImpl,
}: {
  supabaseUrl: string;
  serviceRoleKey: string;
  profile: {
    user_id: string;
    company_id: string;
    role: "admin";
    email?: string | null;
    is_active?: boolean;
  };
  fetchImpl?: typeof fetch;
}): Promise<ProfileRow> {
  const f = fetchImpl ?? fetch;
  const url = new URL("/rest/v1/profiles", supabaseUrl);
  url.searchParams.set("select", "user_id,company_id,role,email");

  const res = await f(url.toString(), {
    method: "POST",
    headers: {
      ...adminHeaders(serviceRoleKey),
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(profile),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase admin PostgREST error ${res.status}: ${text}`);
  }

  const json = await res.json();
  const rows = z.array(profileSchema).parse(json);
  if (!rows[0]) throw new Error("Profile upsert returned no row");
  return rows[0];
}
