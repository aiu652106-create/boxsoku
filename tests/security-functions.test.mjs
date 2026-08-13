import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const projectRoot = decodeURIComponent(new URL("..", import.meta.url).pathname).replace(
  /^\//,
  ""
);
const { onRequestGet } = await import(
  pathToFileURL(`${projectRoot.replaceAll("/", "\\")}functions\\image-proxy.js`).href
);

const invalid = await onRequestGet({
  request: new Request("https://boxsoku.com/image-proxy?url=not-a-url")
});
assert.equal(invalid.status, 400);
assert.equal(invalid.headers.get("X-Content-Type-Options"), "nosniff");

const blocked = await onRequestGet({
  request: new Request(
    "https://boxsoku.com/image-proxy?url=https%3A%2F%2Fevil.example%2Fsp%2Fimg%2Fboxer%2F1.png"
  )
});
assert.equal(blocked.status, 403);

const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async () =>
    new Response("<html>not an image</html>", {
      status: 200,
      headers: { "Content-Type": "text/html", "Content-Length": "24" }
    });
  const wrongType = await onRequestGet({
    request: new Request(
      "https://boxsoku.com/image-proxy?url=https%3A%2F%2Fboxmob.jp%2Fsp%2Fimg%2Fboxer%2F1.png"
    )
  });
  assert.equal(wrongType.status, 415);

  globalThis.fetch = async () =>
    new Response(new Uint8Array([137, 80, 78, 71]), {
      status: 200,
      headers: { "Content-Type": "image/png", "Content-Length": "4" }
    });
  const image = await onRequestGet({
    request: new Request(
      "https://boxsoku.com/image-proxy?url=https%3A%2F%2Fboxmob.jp%2Fsp%2Fimg%2Fboxer%2F1.png"
    )
  });
  assert.equal(image.status, 200);
  assert.equal(image.headers.get("Content-Type"), "image/png");
  assert.equal(image.headers.get("X-Frame-Options"), "SAMEORIGIN");
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Security function checks passed");
