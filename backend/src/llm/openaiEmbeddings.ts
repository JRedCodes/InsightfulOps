import { z } from "zod";

const embeddingItemSchema = z.object({
  embedding: z.array(z.number()),
  index: z.number().int(),
});

const embeddingsResponseSchema = z.object({
  data: z.array(embeddingItemSchema),
});

export async function openaiEmbedTexts({
  apiKey,
  inputs,
  model = "text-embedding-3-small",
  fetchImpl,
}: {
  apiKey: string;
  inputs: string[];
  model?: string;
  fetchImpl?: typeof fetch;
}): Promise<number[][]> {
  const f = fetchImpl ?? fetch;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
  if (inputs.length === 0) return [];

  const res = await f("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: inputs }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI embeddings error ${res.status}: ${text}`);
  }

  const json = await res.json();
  const parsed = embeddingsResponseSchema.parse(json);
  // Ensure stable ordering by index.
  const sorted = [...parsed.data].sort((a, b) => a.index - b.index);
  return sorted.map((d) => d.embedding);
}

