import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const projectRoot = decodeURIComponent(new URL("..", import.meta.url).pathname).replace(
  /^\//,
  ""
);
const { onRequestPost } = await import(
  pathToFileURL(`${projectRoot.replaceAll("/", "\\")}functions\\api\\comments.js`).href
);

const articleId = "11111111-1111-4111-8111-111111111111";
const inserted = {
  id: 7,
  article_id: articleId,
  display_name: "test",
  body: "hello",
  visitor_id: "abcdef123",
  created_at: "2026-08-13T00:00:00.000Z"
};
const env = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon",
  COMMENT_ID_SALT: "salt",
  BOXSOKU_SERVER_TOKEN: "unit-test-server-token"
};
const calls = [];
const originalFetch = globalThis.fetch;

globalThis.fetch = async (input, init = {}) => {
  const url = String(input);
  calls.push({ url, init });
  if (url.includes("select=id&article_id=")) return Response.json([]);
  if (url.includes("select=id%2Carticle_id")) return Response.json([inserted]);
  if (url.includes("rpc/submit_comment")) return Response.json([inserted]);
  throw new Error("Unexpected mocked request");
};

try {
  const response = await onRequestPost({
    env,
    request: new Request("https://boxsoku.com/api/comments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://boxsoku.com",
        "CF-Connecting-IP": "203.0.113.5"
      },
      body: JSON.stringify({ articleId, name: "test", body: "hello" })
    })
  });
  assert.equal(response.status, 201);
  const rpcCall = calls.find((call) => call.url.includes("rpc/submit_comment"));
  assert.ok(rpcCall);
  assert.equal(JSON.parse(rpcCall.init.body).p_server_token, env.BOXSOKU_SERVER_TOKEN);

  const blocked = await onRequestPost({
    env,
    request: new Request("https://boxsoku.com/api/comments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://evil.example"
      },
      body: "{}"
    })
  });
  assert.equal(blocked.status, 403);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Comment API checks passed");
