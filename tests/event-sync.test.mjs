import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const projectRoot = decodeURIComponent(new URL("..", import.meta.url).pathname).replace(/^\//, "");
const { onRequestPost } = await import(
  pathToFileURL(`${projectRoot.replaceAll("/", "\\")}functions\\api\\event-sync.js`).href
);

const env = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "public-key",
  BOXSOKU_SERVER_TOKEN: "sync-secret"
};

const config = {
  source_key: "lemino",
  display_name: "Lemino BOXING公式",
  adapter_key: "lemino",
  source_url: "https://lemino.docomo.ne.jp/ft/0000002/portal/",
  timeout_ms: 10000,
  max_retries: 1,
  last_etag: '"abc"',
  last_modified: "Wed, 26 Aug 2026 00:00:00 GMT"
};

function request(body = {}) {
  return new Request("https://boxsoku.com/api/event-sync", {
    method: "POST",
    headers: {
      Origin: "https://boxsoku.com",
      "X-Boxsoku-Event-Sync-Token": "sync-secret",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

const sampleHtml = `<script type="application/ld+json">{"@type":"SportsEvent","name":"Phoenix Battle 160","url":"https://lemino.docomo.ne.jp/ft/0000002/pxb/160","startDate":"2026-09-08T17:30:00+09:00","location":{"name":"後楽園ホール"}}</script>`;
const originalFetch = globalThis.fetch;
try {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).endsWith("/list_event_source_configs")) {
      return new Response(JSON.stringify([config]), { status: 200 });
    }
    if (String(url).endsWith("/begin_event_source_run")) {
      return new Response(JSON.stringify({
        started: true,
        run_id: "11111111-1111-4111-8111-111111111111",
        source_key: "lemino",
        source_url: config.source_url,
        adapter_key: "lemino",
        timeout_ms: 10000,
        max_retries: 1,
        last_etag: config.last_etag,
        last_modified: config.last_modified
      }), { status: 200 });
    }
    if (String(url) === config.source_url) {
      assert.equal(init.headers["If-None-Match"], config.last_etag);
      assert.equal(init.headers["If-Modified-Since"], config.last_modified);
      return new Response(sampleHtml, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8", etag: '"next"' }
      });
    }
    if (String(url).endsWith("/save_event_update_candidate")) {
     const body = JSON.parse(init.body);
     assert.equal(body.p_source_key, "lemino");
      assert.equal(body.p_source_event_key, "https://lemino.docomo.ne.jp/ft/0000002/pxb/160");
     assert.doesNotMatch(JSON.stringify(body), /<script|<iframe/i);
      return new Response("[]", { status: 200 });
    }
   if (String(url).endsWith("/finish_event_source_run")) {
      const body = JSON.parse(init.body);
      assert.equal(body.p_external_request_count, 1);
     return new Response(JSON.stringify({ outcome: "success" }), { status: 200 });
   }
    throw new Error(`unexpected URL ${url}`);
  };
  const response = await onRequestPost({ env, request: request({ sourceKey: "lemino" }) });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.externalRequests, 1);
  assert.equal(calls.filter((call) => call.url === config.source_url).length, 1);

  const skippedCalls = [];
  globalThis.fetch = async (url, init = {}) => {
    skippedCalls.push(String(url));
    if (String(url).endsWith("/list_event_source_configs")) return new Response(JSON.stringify([config]));
    if (String(url).endsWith("/begin_event_source_run")) return new Response(JSON.stringify({ started: false, reason: "cooldown" }));
    throw new Error(`source should not be fetched: ${url}`);
  };
  const skipped = await onRequestPost({ env, request: request({ sourceKey: "lemino" }) });
  assert.equal(skipped.status, 200);
  assert.equal((await skipped.json()).results[0].reason, "cooldown");
  assert.equal(skippedCalls.filter((url) => url === config.source_url).length, 0);

  let externalCalls = 0;
  globalThis.fetch = async (url) => {
    const value = String(url);
    if (value.endsWith("/list_event_source_configs")) return new Response(JSON.stringify([config]));
    if (value.endsWith("/begin_event_source_run")) return new Response(JSON.stringify({
      started: true,
      run_id: "22222222-2222-4222-8222-222222222222",
      source_url: config.source_url,
      adapter_key: "lemino",
      timeout_ms: 10000,
      max_retries: 1
    }));
    if (value === config.source_url) {
      externalCalls += 1;
      return new Response("rate limited", { status: 429 });
    }
    if (value.endsWith("/finish_event_source_run")) return new Response(JSON.stringify({ outcome: "blocked" }));
    throw new Error(`unexpected URL ${url}`);
  };
  const blocked = await onRequestPost({ env, request: request({ sourceKey: "lemino" }) });
  assert.equal(blocked.status, 502);
  assert.equal(externalCalls, 1);
  assert.equal((await blocked.json()).results[0].outcome, "blocked");

  let serverErrors = 0;
  globalThis.fetch = async (url) => {
    const value = String(url);
    if (value.endsWith("/list_event_source_configs")) return new Response(JSON.stringify([config]));
    if (value.endsWith("/begin_event_source_run")) return new Response(JSON.stringify({
      started: true,
      run_id: "44444444-4444-4444-8444-444444444444",
      source_url: config.source_url,
      adapter_key: "lemino",
      timeout_ms: 10000,
      max_retries: 1
    }));
    if (value === config.source_url) {
      serverErrors += 1;
      return new Response("temporary failure", { status: 503 });
    }
    if (value.endsWith("/finish_event_source_run")) return new Response(JSON.stringify({ outcome: "failed" }));
    throw new Error(`unexpected URL ${url}`);
  };
 const failed = await onRequestPost({ env, request: request({ sourceKey: "lemino" }) });
 assert.equal(failed.status, 502);
  assert.equal(serverErrors, 1);
  assert.equal((await failed.json()).results[0].outcome, "blocked");

  let notModifiedExternal = 0;
  globalThis.fetch = async (url) => {
    const value = String(url);
    if (value.endsWith("/list_event_source_configs")) return new Response(JSON.stringify([config]));
    if (value.endsWith("/begin_event_source_run")) return new Response(JSON.stringify({
      started: true,
      run_id: "55555555-5555-4555-8555-555555555555",
      source_url: config.source_url,
      adapter_key: "lemino",
      timeout_ms: 10000,
      max_retries: 1
    }));
    if (value === config.source_url) {
      notModifiedExternal += 1;
      return new Response(null, { status: 304 });
    }
    if (value.endsWith("/finish_event_source_run")) return new Response(JSON.stringify({ outcome: "not_modified" }));
    throw new Error(`unexpected URL ${url}`);
  };
  const notModified = await onRequestPost({ env, request: request({ sourceKey: "lemino" }) });
  assert.equal(notModified.status, 200);
  assert.equal(notModifiedExternal, 1);
  assert.equal((await notModified.json()).results[0].outcome, "not_modified");
  let forbiddenExternal = 0;
  globalThis.fetch = async (url) => {
    const value = String(url);
    if (value.endsWith("/list_event_source_configs")) return new Response(JSON.stringify([config]));
    if (value.endsWith("/begin_event_source_run")) return new Response(JSON.stringify({
      started: true,
      run_id: "66666666-6666-4666-8666-666666666666",
      source_url: config.source_url,
      adapter_key: "lemino",
      timeout_ms: 10000,
      max_retries: 1
    }));
    if (value === config.source_url) {
      forbiddenExternal += 1;
      return new Response("forbidden", { status: 403 });
    }
    if (value.endsWith("/finish_event_source_run")) return new Response(JSON.stringify({ outcome: "blocked" }));
    throw new Error(`unexpected URL ${url}`);
  };
  const forbidden = await onRequestPost({ env, request: request({ sourceKey: "lemino" }) });
  assert.equal(forbidden.status, 502);
  assert.equal(forbiddenExternal, 1);
  assert.equal((await forbidden.json()).results[0].outcome, "blocked");

  let retryableExternal = 0;
  let retryFinishBody = null;
  globalThis.fetch = async (url, init = {}) => {
    const value = String(url);
    if (value.endsWith("/list_event_source_configs")) return new Response(JSON.stringify([config]));
    if (value.endsWith("/begin_event_source_run")) return new Response(JSON.stringify({
      started: true,
      run_id: "77777777-7777-4777-8777-777777777777",
      source_url: config.source_url,
      adapter_key: "lemino",
      timeout_ms: 10000,
      max_retries: 1
    }));
    if (value === config.source_url) {
      retryableExternal += 1;
      if (retryableExternal === 1) return new Response("temporary", { status: 500 });
      return new Response(sampleHtml, { status: 200, headers: { "content-type": "text/html" } });
    }
    if (value.endsWith("/save_event_update_candidate")) return new Response("[]", { status: 200 });
    if (value.endsWith("/finish_event_source_run")) {
      retryFinishBody = JSON.parse(init.body);
      return new Response(JSON.stringify({ outcome: "success" }));
    }
    throw new Error(`unexpected URL ${url}`);
  };
 const retried = await onRequestPost({ env, request: request({ sourceKey: "lemino" }) });
 assert.equal(retried.status, 200);
 assert.equal(retryableExternal, 2);
  const retriedPayload = await retried.json();
  assert.equal(retriedPayload.results[0].retryCount, 1);
  assert.equal(retriedPayload.results[0].externalRequests, 2);
 assert.equal(retryFinishBody.p_retry_count, 1);
 assert.equal(retryFinishBody.p_external_request_count, 2);

} finally {
  globalThis.fetch = originalFetch;
}

console.log("Event sync API checks passed");
