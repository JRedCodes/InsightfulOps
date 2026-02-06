import { describe, expect, it } from "vitest";
import { chunkText, estimateTokenCount } from "../src/ingestion/chunking";

describe("estimateTokenCount", () => {
  it("counts whitespace-separated words", () => {
    expect(estimateTokenCount("")).toBe(0);
    expect(estimateTokenCount("   ")).toBe(0);
    expect(estimateTokenCount("hello")).toBe(1);
    expect(estimateTokenCount("hello world")).toBe(2);
    expect(estimateTokenCount("hello   world\nagain")).toBe(3);
  });
});

describe("chunkText", () => {
  it("returns empty array for empty input", () => {
    expect(chunkText({ text: "" })).toEqual([]);
    expect(chunkText({ text: "   \n\n  " })).toEqual([]);
  });

  it("keeps small text as a single chunk", () => {
    const chunks = chunkText({ text: "One two three", maxTokens: 10, overlapTokens: 2 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.content).toBe("One two three");
  });

  it("splits long paragraph by word windows with overlap", () => {
    const text = Array.from({ length: 25 }, (_, i) => `w${i + 1}`).join(" ");
    const chunks = chunkText({ text, maxTokens: 10, overlapTokens: 3 });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.token_count).toBeLessThanOrEqual(10);
    expect(chunks[1]?.token_count).toBeLessThanOrEqual(10);

    // Ensure overlap: last 3 words of chunk0 appear at start-ish of chunk1
    const c0Words = chunks[0]!.content.split(/\s+/);
    const c1Words = chunks[1]!.content.split(/\s+/);
    const overlap = c0Words.slice(-3).join(" ");
    expect(c1Words.join(" ")).toContain(overlap);
  });

  it("prefers paragraph boundaries when possible", () => {
    const text = ["para one a b c", "para two d e f", "para three g h i"].join("\n\n");
    const chunks = chunkText({ text, maxTokens: 10, overlapTokens: 0 });
    expect(chunks.length).toBe(2);
    expect(chunks[0]!.content).toContain("para one");
    expect(chunks[0]!.content).toContain("para two");
    expect(chunks[1]!.content).toContain("para three");
  });

  it("throws on invalid config", () => {
    expect(() => chunkText({ text: "x", maxTokens: 0 })).toThrow();
    expect(() => chunkText({ text: "x", maxTokens: 10, overlapTokens: -1 })).toThrow();
    expect(() => chunkText({ text: "x", maxTokens: 10, overlapTokens: 10 })).toThrow();
  });
});
