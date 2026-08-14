import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const projectRoot = decodeURIComponent(new URL("..", import.meta.url).pathname).replace(
  /^\//,
  ""
);
const { onRequestPost } = await import(
  pathToFileURL(
    `${projectRoot.replaceAll("/", "\\")}functions\\api\\site-event.js`
  ).href
);

const env = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "public-key",
  VISITOR_ID_SALT: "test-visitor-salt",
  BOXSOKU_SERVER_TOKEN: "test-server-token"
};

function request(payload, options = {}) {
  return new Request(
    `https://boxsoku.com/api/site-event${options.query || ""}`,
    {
      method: "POST",
      headers: {
        Origin: options.origin || "https://boxsoku.com",
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      body: JSON.stringify(payload)
    }
  );
}

const payload = {
  articleSlug: "lemino-boxing-phoenix-battle-161-2026-09-21",
  pagePath: "/news/lemino-boxing-phoenix-battle-161-2026-09-21",
  service: "lemino",
  placement: "article-bottom-banner",
  item: ""
};

const blockedOrigin = await onRequestPost({
  env,
  request: request(payload, { origin: "https://evil.example" })
});
assert.equal(blockedOrigin.status, 403);

const invalidService = await onRequestPost({
  env,
  request: request({ ...payload, service: "unknown" })
});
assert.equal(invalidService.status, 422);

let fetchCalls = 0;
const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async (url, init) => {
    fetchCalls += 1;
    assert.equal(
      url,
      "https://example.supabase.co/rest/v1/rpc/record_affiliate_click"
    );
    const body = JSON.parse(init.body);
    assert.equal(body.p_article_slug, payload.articleSlug);
    assert.equal(body.p_service, "lemino");
    assert.equal(body.p_placement, "article-bottom-banner");
    assert.match(body.p_visitor_hash, /^[a-f0-9]{64}$/);
    assert.equal(body.p_server_token, "test-server-token");
    return new Response(null, { status: 204 });
  };

  const valid = await onRequestPost({ env, request: request(payload) });
  assert.equal(valid.status, 201);
  assert.match(valid.headers.get("Set-Cookie") || "", /^boxsoku_visitor=/);
  assert.equal(fetchCalls, 1);

  const verification = await onRequestPost({
    env,
    request: request(payload, { query: "?boxsoku_verify=1" })
  });
  assert.equal(verification.status, 200);
  assert.deepEqual(await verification.json(), { ok: true, recorded: false });
  assert.equal(fetchCalls, 1);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Affiliate click API checks passed");
