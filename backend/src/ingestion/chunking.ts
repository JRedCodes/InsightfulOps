export type Chunk = {
  /** 0-based index in returned list */
  index: number;
  /** Chunk text content */
  content: string;
  /** Approx token count (word-based heuristic for MVP) */
  token_count: number;
};

export function estimateTokenCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  // MVP heuristic: treat whitespace-separated words as "tokens".
  return trimmed.split(/\s+/).length;
}

export function chunkText({
  text,
  maxTokens = 400,
  overlapTokens = 50,
}: {
  text: string;
  maxTokens?: number;
  overlapTokens?: number;
}): Chunk[] {
  if (maxTokens <= 0) throw new Error("maxTokens must be > 0");
  if (overlapTokens < 0) throw new Error("overlapTokens must be >= 0");
  if (overlapTokens >= maxTokens) throw new Error("overlapTokens must be < maxTokens");

  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  // Preserve paragraph boundaries first, then fall back to word windows.
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: Chunk[] = [];
  let current: string[] = [];
  let currentTokens = 0;

  function flush() {
    const content = current.join("\n\n").trim();
    if (!content) return;
    chunks.push({
      index: chunks.length,
      content,
      token_count: estimateTokenCount(content),
    });
  }

  for (const para of paragraphs) {
    const paraTokens = estimateTokenCount(para);

    // If paragraph alone is too large, flush current and split paragraph by words.
    if (paraTokens > maxTokens) {
      flush();
      current = [];
      currentTokens = 0;

      const words = para.split(/\s+/);
      let start = 0;
      while (start < words.length) {
        const end = Math.min(start + maxTokens, words.length);
        const window = words.slice(start, end).join(" ").trim();
        chunks.push({
          index: chunks.length,
          content: window,
          token_count: estimateTokenCount(window),
        });
        if (end >= words.length) break;
        start = Math.max(0, end - overlapTokens);
      }
      continue;
    }

    // If paragraph fits, try to add to current chunk.
    const nextTokens = currentTokens + paraTokens;
    if (nextTokens <= maxTokens) {
      current.push(para);
      currentTokens = nextTokens;
      continue;
    }

    // Flush and start a new chunk with overlap from the end of the previous chunk.
    flush();

    if (overlapTokens > 0) {
      const prevWords = current.join("\n\n").split(/\s+/);
      const overlap = prevWords
        .slice(Math.max(0, prevWords.length - overlapTokens))
        .join(" ")
        .trim();
      current = overlap ? [overlap, para] : [para];
    } else {
      current = [para];
    }
    currentTokens = estimateTokenCount(current.join("\n\n"));
  }

  flush();
  return chunks;
}
