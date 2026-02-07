import { z } from "zod";

const chatResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string().nullable().optional(),
      }),
    })
  ),
});

export async function openaiAnswerWithSources({
  apiKey,
  question,
  sources,
  model = "gpt-4o-mini",
  fetchImpl,
}: {
  apiKey: string;
  question: string;
  sources: Array<{ title: string; content: string }>;
  model?: string;
  fetchImpl?: typeof fetch;
}): Promise<string> {
  const f = fetchImpl ?? fetch;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const sourcesBlock = sources
    .map((s, i) => `SOURCE ${i + 1}: ${s.title}\n${s.content}`)
    .join("\n\n---\n\n");

  const res = await f("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are InsightfulOps Assistant. Answer ONLY using the provided sources. " +
            "If the sources do not contain the answer, say you don't have sufficient sources.",
        },
        {
          role: "user",
          content: `Question:\n${question}\n\nSources:\n${sourcesBlock}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI chat error ${res.status}: ${text}`);
  }

  const json = await res.json();
  const parsed = chatResponseSchema.parse(json);
  const content = parsed.choices[0]?.message.content ?? "";
  return String(content).trim();
}

