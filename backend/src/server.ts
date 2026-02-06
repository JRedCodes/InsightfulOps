import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load env from repo root (InsightfulOps/.env), even when running from backend/ workspace.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

const app = createApp();

app.listen(port, () => {
  console.log(`[backend] listening on http://localhost:${port}`);
});
