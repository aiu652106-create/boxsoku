import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

export const DEFAULT_EVENT_SYNC_URL = "https://boxsoku.com/api/event-sync";

export async function runScheduledSync({
  env = process.env,
  fetchImpl = globalThis.fetch
} = {}) {
  const token = String(env.BOXSOKU_SERVER_TOKEN || "").trim();
  if (!token) {
    return { ok: false, skipped: true, reason: "missing_secret", externalRequests: 0 };
  }
  if (typeof fetchImpl !== "function") {
    throw new Error("fetch is unavailable");
  }

  const target = String(env.BOXSOKU_EVENT_SYNC_URL || DEFAULT_EVENT_SYNC_URL).trim();
  let url;
  try {
    url = new URL(target);
  } catch {
    throw new Error("event sync URL is invalid");
  }
  if (url.protocol !== "https:") {
    throw new Error("event sync URL must use HTTPS");
  }

  const response = await fetchImpl(url.href, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Boxsoku-Event-Sync-Token": token
    },
    body: "{}"
  });
  if (!response?.ok) {
    const error = new Error(`event sync failed (${response?.status || "unknown"})`);
    error.externalRequests = 1;
    throw error;
  }
  return { ok: true, skipped: false, status: response.status, externalRequests: 1 };
}

const isMain = process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  try {
    const result = await runScheduledSync();
    if (result.skipped) {
      console.error("BOXSOKU_SERVER_TOKEN is not configured");
      process.exitCode = 1;
    } else {
      console.log(`event sync completed (HTTP ${result.status})`);
    }
  } catch (error) {
    console.error(error.message || "event sync failed");
    process.exitCode = 1;
  }
}
