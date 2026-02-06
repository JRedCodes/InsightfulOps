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

const conversationSchema = z.object({
  id: z.string().uuid(),
  title: z.string().nullable().optional(),
  created_at: z.string(),
});

export type ConversationRow = z.infer<typeof conversationSchema>;

const messageSchema = z.object({
  id: z.string().uuid(),
  sender: z.enum(["user", "assistant"]),
  content: z.string(),
  confidence: z.number().nullable().optional(),
  no_sufficient_sources: z.boolean().optional(),
  needs_admin_review: z.boolean().optional(),
  created_at: z.string(),
});

export type MessageRow = z.infer<typeof messageSchema>;

const feedbackRatingSchema = z.enum(["up", "down"]);

const assistantFeedbackSchema = z.object({
  id: z.string().uuid(),
  message_id: z.string().uuid(),
  rating: feedbackRatingSchema,
  comment: z.string().nullable().optional(),
  created_at: z.string(),
});

export type AssistantFeedbackRow = z.infer<typeof assistantFeedbackSchema>;

export async function createConversation({
  supabaseUrl,
  supabaseAnonKey,
  accessToken,
  conversation,
  fetchImpl,
}: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  accessToken: string;
  conversation: {
    company_id: string;
    created_by: string;
    title?: string | null;
  };
  fetchImpl?: typeof fetch;
}): Promise<ConversationRow> {
  const f = fetchImpl ?? fetch;
  const url = new URL("/rest/v1/conversations", supabaseUrl);
  url.searchParams.set("select", "id,title,created_at");

  const res = await f(url.toString(), {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(conversation),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase PostgREST error ${res.status}: ${text}`);
  }

  const json = await res.json();
  const rows = z.array(conversationSchema).parse(json);
  if (!rows[0]) throw new Error("Conversation insert returned no row");
  return rows[0];
}

export async function createMessage({
  supabaseUrl,
  supabaseAnonKey,
  accessToken,
  message,
  fetchImpl,
}: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  accessToken: string;
  message: {
    company_id: string;
    conversation_id: string;
    sender: "user" | "assistant";
    content: string;
    confidence?: number | null;
    no_sufficient_sources?: boolean;
    needs_admin_review?: boolean;
  };
  fetchImpl?: typeof fetch;
}): Promise<MessageRow> {
  const f = fetchImpl ?? fetch;
  const url = new URL("/rest/v1/messages", supabaseUrl);
  url.searchParams.set(
    "select",
    "id,sender,content,confidence,no_sufficient_sources,needs_admin_review,created_at"
  );

  const res = await f(url.toString(), {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(message),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase PostgREST error ${res.status}: ${text}`);
  }

  const json = await res.json();
  const rows = z.array(messageSchema).parse(json);
  if (!rows[0]) throw new Error("Message insert returned no row");
  return rows[0];
}

export async function createAssistantFeedback({
  supabaseUrl,
  supabaseAnonKey,
  accessToken,
  feedback,
  fetchImpl,
}: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  accessToken: string;
  feedback: {
    company_id: string;
    message_id: string;
    user_id: string;
    rating: "up" | "down";
    comment?: string | null;
  };
  fetchImpl?: typeof fetch;
}): Promise<AssistantFeedbackRow> {
  const f = fetchImpl ?? fetch;
  const url = new URL("/rest/v1/assistant_feedback", supabaseUrl);
  url.searchParams.set("select", "id,message_id,rating,comment,created_at");

  const res = await f(url.toString(), {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(feedback),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase PostgREST error ${res.status}: ${text}`);
  }

  const json = await res.json();
  const rows = z.array(assistantFeedbackSchema).parse(json);
  if (!rows[0]) throw new Error("Feedback insert returned no row");
  return rows[0];
}

const shiftSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  starts_at: z.string(),
  ends_at: z.string(),
  role_label: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string(),
});

export type ShiftRow = z.infer<typeof shiftSchema>;

const companySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  timezone: z.string(),
  week_start: z.string(),
  shift_min_minutes: z.number().int(),
  created_at: z.string(),
});

export type CompanyRow = z.infer<typeof companySchema>;

const companyUserSchema = z.object({
  user_id: z.string().uuid(),
  email: z.string().email().nullable().optional(),
  full_name: z.string().nullable().optional(),
  role: z.enum(["employee", "manager", "admin"]),
  is_active: z.boolean().optional(),
  created_at: z.string().optional(),
});

export type CompanyUserRow = z.infer<typeof companyUserSchema>;

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

export async function fetchCompanyUsers({
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
}): Promise<CompanyUserRow[]> {
  const f = fetchImpl ?? fetch;
  const url = new URL("/rest/v1/profiles", supabaseUrl);
  url.searchParams.set("select", "user_id,email,full_name,role,is_active,created_at");
  url.searchParams.set("order", "created_at.asc");
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
  return z.array(companyUserSchema).parse(json);
}

export async function updateUserRole({
  supabaseUrl,
  supabaseAnonKey,
  accessToken,
  userId,
  role,
  fetchImpl,
}: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  accessToken: string;
  userId: string;
  role: "employee" | "manager" | "admin";
  fetchImpl?: typeof fetch;
}): Promise<CompanyUserRow | null> {
  const f = fetchImpl ?? fetch;
  const url = new URL("/rest/v1/profiles", supabaseUrl);
  url.searchParams.set("select", "user_id,email,full_name,role,is_active,created_at");
  url.searchParams.set("user_id", `eq.${userId}`);

  const res = await f(url.toString(), {
    method: "PATCH",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ role }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase PostgREST error ${res.status}: ${text}`);
  }

  const json = await res.json();
  const rows = z.array(companyUserSchema).parse(json);
  return rows[0] ?? null;
}

export async function deactivateUser({
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
}): Promise<CompanyUserRow | null> {
  const f = fetchImpl ?? fetch;
  const url = new URL("/rest/v1/profiles", supabaseUrl);
  url.searchParams.set("select", "user_id,email,full_name,role,is_active,created_at");
  url.searchParams.set("user_id", `eq.${userId}`);

  const res = await f(url.toString(), {
    method: "PATCH",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ is_active: false }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase PostgREST error ${res.status}: ${text}`);
  }

  const json = await res.json();
  const rows = z.array(companyUserSchema).parse(json);
  return rows[0] ?? null;
}

export async function updateCompanySettings({
  supabaseUrl,
  supabaseAnonKey,
  accessToken,
  companyId,
  patch,
  fetchImpl,
}: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  accessToken: string;
  companyId: string;
  patch: Partial<{
    timezone: string;
    week_start: string;
    shift_min_minutes: number;
  }>;
  fetchImpl?: typeof fetch;
}): Promise<CompanyRow | null> {
  const f = fetchImpl ?? fetch;
  const url = new URL("/rest/v1/companies", supabaseUrl);
  url.searchParams.set("select", "id,name,timezone,week_start,shift_min_minutes,created_at");
  url.searchParams.set("id", `eq.${companyId}`);

  const res = await f(url.toString(), {
    method: "PATCH",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(patch),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase PostgREST error ${res.status}: ${text}`);
  }

  const json = await res.json();
  const rows = z.array(companySchema).parse(json);
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

export async function fetchDocumentById({
  supabaseUrl,
  supabaseAnonKey,
  accessToken,
  docId,
  fetchImpl,
}: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  accessToken: string;
  docId: string;
  fetchImpl?: typeof fetch;
}): Promise<DocumentRow | null> {
  const f = fetchImpl ?? fetch;
  const url = new URL("/rest/v1/documents", supabaseUrl);
  url.searchParams.set("select", "id,title,visibility,status,created_at");
  url.searchParams.set("id", `eq.${docId}`);
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
  const rows = z.array(documentSchema).parse(json);
  return rows[0] ?? null;
}

export async function updateDocumentStatus({
  supabaseUrl,
  supabaseAnonKey,
  accessToken,
  docId,
  status,
  fetchImpl,
}: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  accessToken: string;
  docId: string;
  status: "processing" | "indexed" | "failed" | "archived";
  fetchImpl?: typeof fetch;
}): Promise<DocumentRow | null> {
  const f = fetchImpl ?? fetch;
  const url = new URL("/rest/v1/documents", supabaseUrl);
  url.searchParams.set("select", "id,title,visibility,status,created_at");
  url.searchParams.set("id", `eq.${docId}`);

  const res = await f(url.toString(), {
    method: "PATCH",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase PostgREST error ${res.status}: ${text}`);
  }

  const json = await res.json();
  const rows = z.array(documentSchema).parse(json);
  return rows[0] ?? null;
}

export async function fetchConversations({
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
}): Promise<ConversationRow[]> {
  const f = fetchImpl ?? fetch;
  const url = new URL("/rest/v1/conversations", supabaseUrl);
  url.searchParams.set("select", "id,title,created_at");
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
  return z.array(conversationSchema).parse(json);
}

export async function fetchConversationMessages({
  supabaseUrl,
  supabaseAnonKey,
  accessToken,
  conversationId,
  fetchImpl,
}: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  accessToken: string;
  conversationId: string;
  fetchImpl?: typeof fetch;
}): Promise<MessageRow[]> {
  const f = fetchImpl ?? fetch;
  const url = new URL("/rest/v1/messages", supabaseUrl);
  url.searchParams.set(
    "select",
    "id,sender,content,confidence,no_sufficient_sources,needs_admin_review,created_at"
  );
  url.searchParams.set("conversation_id", `eq.${conversationId}`);
  url.searchParams.set("order", "created_at.asc");

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
  return z.array(messageSchema).parse(json);
}

export async function fetchShifts({
  supabaseUrl,
  supabaseAnonKey,
  accessToken,
  startsAt,
  endsAt,
  userId,
  fetchImpl,
}: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  accessToken: string;
  startsAt: string;
  endsAt: string;
  userId?: string;
  fetchImpl?: typeof fetch;
}): Promise<ShiftRow[]> {
  const f = fetchImpl ?? fetch;
  const url = new URL("/rest/v1/shifts", supabaseUrl);
  url.searchParams.set("select", "id,user_id,starts_at,ends_at,role_label,notes,created_at");
  url.searchParams.set("starts_at", `gte.${startsAt}`);
  url.searchParams.set("ends_at", `lte.${endsAt}`);
  if (userId) url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("order", "starts_at.asc");

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
  return z.array(shiftSchema).parse(json);
}

export async function createShift({
  supabaseUrl,
  supabaseAnonKey,
  accessToken,
  shift,
  fetchImpl,
}: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  accessToken: string;
  shift: {
    company_id: string;
    user_id: string;
    starts_at: string;
    ends_at: string;
    role_label?: string | null;
    notes?: string | null;
    created_by?: string | null;
  };
  fetchImpl?: typeof fetch;
}): Promise<ShiftRow> {
  const f = fetchImpl ?? fetch;
  const url = new URL("/rest/v1/shifts", supabaseUrl);
  url.searchParams.set("select", "id,user_id,starts_at,ends_at,role_label,notes,created_at");

  const res = await f(url.toString(), {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(shift),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase PostgREST error ${res.status}: ${text}`);
  }

  const json = await res.json();
  const rows = z.array(shiftSchema).parse(json);
  if (!rows[0]) throw new Error("Shift insert returned no row");
  return rows[0];
}

export async function updateShift({
  supabaseUrl,
  supabaseAnonKey,
  accessToken,
  shiftId,
  patch,
  fetchImpl,
}: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  accessToken: string;
  shiftId: string;
  patch: Partial<{
    user_id: string;
    starts_at: string;
    ends_at: string;
    role_label: string | null;
    notes: string | null;
  }>;
  fetchImpl?: typeof fetch;
}): Promise<ShiftRow | null> {
  const f = fetchImpl ?? fetch;
  const url = new URL("/rest/v1/shifts", supabaseUrl);
  url.searchParams.set("select", "id,user_id,starts_at,ends_at,role_label,notes,created_at");
  url.searchParams.set("id", `eq.${shiftId}`);

  const res = await f(url.toString(), {
    method: "PATCH",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(patch),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase PostgREST error ${res.status}: ${text}`);
  }

  const json = await res.json();
  const rows = z.array(shiftSchema).parse(json);
  return rows[0] ?? null;
}

export async function deleteShift({
  supabaseUrl,
  supabaseAnonKey,
  accessToken,
  shiftId,
  fetchImpl,
}: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  accessToken: string;
  shiftId: string;
  fetchImpl?: typeof fetch;
}): Promise<boolean> {
  const f = fetchImpl ?? fetch;
  const url = new URL("/rest/v1/shifts", supabaseUrl);
  url.searchParams.set("id", `eq.${shiftId}`);

  const res = await f(url.toString(), {
    method: "DELETE",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      Prefer: "return=minimal",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase PostgREST error ${res.status}: ${text}`);
  }

  return true;
}
