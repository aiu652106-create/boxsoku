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
{"@context":"https://schema.org","@type":"SportsEvent","name":"Phoenix Battle 160","url":"https://lemino.docomo.ne.jp/ft/0000002/pxb/160","startDate":"2026-09-08T17:30:00+09:00","location":{"@type":"Place","name":"後楽園ホール"},"organizer":{"name":"Lemino BOXING公式"},"subEvent":[{"@type":"SportsEvent","name":"第2試合","position":2,"competitor":[{"name":"選手A"},{"name":"選手B"}]}]}
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
assert.equal(canonicalKey(normalized), "source|lemino|https-lemino.docomo.ne.jp-ft-0000002-pxb-160");
const changedIdentityFields = {
  ...normalized,
  event_name: "Phoenix Battle 160（会場変更）",
  event_date: "2026-09-09",
  venue: "横浜武道館",
  promoter: "別表記の主催者"
};
assert.equal(canonicalKey(changedIdentityFields), canonicalKey(normalized));
assert.doesNotMatch(JSON.stringify(normalized), /script|iframe|evil\.example|alert/i);
assert.doesNotMatch(stripHtml(officialHtml), /must not persist|evil\.example/i);

const noOrderHtml = `<title>DANGAN 2026年8月21日</title><p>開催日：2026年8月21日 会場：後楽園ホール</p>`;
const noOrder = parseSourceHtml("dangan", noOrderHtml, {
  sourceUrl: "https://danganboxing.com/",
  fetchedAt: "2026-08-26T00:00:00.000Z"
});
assert.equal(noOrder.events.length, 0);
assert.ok(noOrder.parserWarnings.includes("no_structured_event_data"));

const leminoBlock = parseSourceHtml("lemino", `<article data-lemino-event="phoenix-160" data-event-url="https://lemino.docomo.ne.jp/ft/0000002/pxb/160" data-event-name="Phoenix Battle 160" data-event-date="2026-09-08" data-venue="後楽園ホール"><div data-bout="true" data-bout-number="2" data-bout-label="第2試合" data-fighter-a="選手A" data-fighter-b="選手B"></div></article>`, {
  sourceUrl: "https://lemino.docomo.ne.jp/ft/0000002/portal/"
});
assert.equal(leminoBlock.events.length, 1);
assert.equal(leminoBlock.events[0].event.source_event_key, "https://lemino.docomo.ne.jp/ft/0000002/pxb/160");
assert.equal(leminoBlock.events[0].event.bouts[0].bout_number, 2);
assert.equal(validateEvent(leminoBlock.events[0].event).length, 0);

const danganBlock = parseSourceHtml("dangan", `<section data-dangan-event="dangan-282" data-source-event-key="dangan-282" data-event-name="DANGAN 282" data-event-date="2026-08-21" data-venue="後楽園ホール"><div data-bout="true" data-fighter-a="選手C" data-fighter-b="選手D"></div></section>`, {
  sourceUrl: "https://danganboxing.com/events/282"
});
assert.equal(danganBlock.events.length, 1);
assert.equal(danganBlock.events[0].event.source_event_key, "id:dangan-282");
assert.equal(danganBlock.events[0].event.bouts[0].bout_number, null);
assert.equal(validateEvent(danganBlock.events[0].event).length, 0);

const multiEventIndex = parseSourceHtml("dangan", `<h1>DANGAN興行一覧</h1><article><h2>イベントA</h2><p>2026年8月21日 後楽園ホール</p></article><article><h2>イベントB</h2><p>2026年9月2日 横浜</p></article>`, {
  sourceUrl: "https://danganboxing.com/"
});
assert.equal(multiEventIndex.events.length, 0);
assert.doesNotMatch(JSON.stringify(multiEventIndex.events), /2026-08-21|2026-09-02/);

const offHost = parseSourceHtml("lemino", `<script type="application/ld+json">{"@type":"SportsEvent","name":"Off-host","url":"https://evil.example/event","startDate":"2026-09-08","location":{"name":"会場"}}</script>`, {
  sourceUrl: "https://lemino.docomo.ne.jp/ft/0000002/portal/"
});
assert.equal(offHost.events.length, 1);
assert.ok(offHost.events[0].validationErrors.includes("source_event_identity_missing"));
assert.doesNotMatch(JSON.stringify(offHost.events[0].event), /evil\\.example|poster_url/i);

const invalid = parseSourceHtml("dangan", "<title>未確定</title><p>boxing</p>", {
  sourceUrl: "https://danganboxing.com/"
});
assert.equal(invalid.events.length, 0);
assert.ok(invalid.parserWarnings.includes("no_structured_event_data"));

console.log("Event source adapter checks passed");
