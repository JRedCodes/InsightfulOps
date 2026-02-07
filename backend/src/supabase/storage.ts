function encodePath(path: string) {
  // Encode each segment but preserve slashes.
  return path
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

export async function downloadFromSupabaseStorage({
  supabaseUrl,
  serviceRoleKey,
  bucket,
  objectPath,
  fetchImpl,
}: {
  supabaseUrl: string;
  serviceRoleKey: string;
  bucket: string;
  objectPath: string;
  fetchImpl?: typeof fetch;
}): Promise<{ body: Buffer; contentType: string | null }> {
  const f = fetchImpl ?? fetch;
  const encodedPath = encodePath(objectPath);
  const url = new URL(`/storage/v1/object/${bucket}/${encodedPath}`, supabaseUrl);

  const res = await f(url.toString(), {
    method: "GET",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase Storage download error ${res.status}: ${text}`);
  }

  const ab = await res.arrayBuffer();
  const body = Buffer.from(ab);
  const contentType = res.headers.get("content-type");
  return { body, contentType };
}

export async function uploadToSupabaseStorage({
  supabaseUrl,
  serviceRoleKey,
  bucket,
  objectPath,
  contentType,
  body,
  fetchImpl,
}: {
  supabaseUrl: string;
  serviceRoleKey: string;
  bucket: string;
  objectPath: string;
  contentType: string;
  body: Buffer;
  fetchImpl?: typeof fetch;
}): Promise<void> {
  const f = fetchImpl ?? fetch;
  const encodedPath = encodePath(objectPath);
  const url = new URL(`/storage/v1/object/${bucket}/${encodedPath}`, supabaseUrl);

  const res = await f(url.toString(), {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase Storage error ${res.status}: ${text}`);
  }
}

