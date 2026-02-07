import path from "node:path";

export function extractTextFromFile({
  filePath,
  bytes,
}: {
  filePath: string;
  bytes: Buffer;
}): { text: string; kind: "txt" | "md" } {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".txt") {
    return { kind: "txt", text: bytes.toString("utf8") };
  }
  if (ext === ".md" || ext === ".markdown") {
    return { kind: "md", text: bytes.toString("utf8") };
  }

  throw new Error(`UNSUPPORTED_FILE_TYPE: ${ext || "<none>"}`);
}

