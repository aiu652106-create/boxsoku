import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const projectRoot = decodeURIComponent(new URL("..", import.meta.url).pathname).replace(/^\//, "");
const { parseSourceHtml, validateEvent, canonicalKey, stripHtml } = await import(
  pathToFileURL(`${projectRoot.replaceAll("/", "\\")}functions\\_shared\\event-sources.js`).href
);

const officialHtml = `<!doctype html>
<html><head><title>Phoenix Battle 160 | Lemino</title>
<meta property="og:title" content="Phoenix Battle 160">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"SportsEvent","name":"Phoenix Battle 160","startDate":"2026-09-08T17:30:00+09:00","location":{"@type":"Place","name":"後楽園ホール"},"organizer":{"name":"Lemino BOXING公式"},"subEvent":[{"@type":"SportsEvent","name":"第2試合","position":2,"competitor":[{"name":"選手A"},{"name":"選手B"}]}]}
</script><script>alert('must not persist')</script></head>
<body><h1>Phoenix Battle 160</h1><p>2026年9月8日　会場：後楽園ホール</p><iframe src="https://evil.example"></iframe></body></html>`;

const parsed = parseSourceHtml("lemino", officialHtml, {
  sourceUrl: "https://lemino.docomo.ne.jp/ft/0000002/pxb/",
  fetchedAt: "2026-08-26T00:00:00.000Z"
});
assert.equal(parsed.events.length, 1);
const normalized = parsed.events[0].event;
assert.equal(normalized.event_name, "Phoenix Battle 160");
assert.equal(normalized.event_date, "2026-09-08");
assert.equal(normalized.venue, "後楽園ホール");
assert.equal(normalized.bouts.length, 1);
assert.equal(normalized.bouts[0].bout_number, 2);
assert.equal(validateEvent(normalized).length, 0);
assert.match(canonicalKey(normalized), /2026-09-08/);
assert.doesNotMatch(JSON.stringify(normalized), /script|iframe|evil\.example|alert/i);
assert.doesNotMatch(stripHtml(officialHtml), /must not persist|evil\.example/i);

const noOrderHtml = `<title>DANGAN 2026年8月21日</title><p>開催日：2026年8月21日 会場：後楽園ホール</p>`;
const noOrder = parseSourceHtml("dangan", noOrderHtml, {
  sourceUrl: "https://danganboxing.com/",
  fetchedAt: "2026-08-26T00:00:00.000Z"
});
assert.equal(noOrder.events.length, 1);
assert.equal(noOrder.events[0].event.event_date, "2026-08-21");
assert.equal(noOrder.events[0].event.bouts.length, 0);

const invalid = parseSourceHtml("dangan", "<title>未確定</title><p>boxing</p>", {
  sourceUrl: "https://danganboxing.com/"
});
assert.ok(invalid.events.length === 0 || invalid.events[0].validationErrors.includes("event_date_missing"));

console.log("Event source adapter checks passed");
