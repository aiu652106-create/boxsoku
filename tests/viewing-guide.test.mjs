import assert from "node:assert/strict";
import fs from "node:fs";
import { japanDay, viewingFacts, scheduleGroups, viewingGuideHtml, officialAnnouncementsHtml, groupedScheduleHtml, streamingLinks } from "../viewing-guide.js";
import { renderListingPage } from "../functions/_shared/listing-page.js";
import { onRequestGet as watchPage } from "../functions/watch.js";

const now = new Date("2026-11-15T00:00:00Z");
const article = {
  slug: "verified-event", title: "11月26日のボクシング試合予定", status: "published",
  body: "## 大会概要\n- 開催日：2026年11月26日\n- 開始：15:30\n- 会場：会場A\n- 配信：Lemino（15:00配信開始）",
  affiliate_links: [{ label: "Leminoで視聴", url: streamingLinks.lemino }],
  published_at: "2026-11-01T00:00:00Z"
};
assert.equal(japanDay("2026-11-14T15:00:00Z"), "2026-11-15");
assert.equal(viewingFacts(article).date, "2026-11-26");
assert.equal(viewingFacts(article).broadcastStart, "15:00");
assert.equal(viewingFacts({ ...article, body: "開催日：2026年2月30日" }).date, "");
assert.equal(viewingFacts({ ...article, body: "2026年11月26日と報道されている" }).date, "");
assert.equal(viewingFacts({ ...article, title: "WOWOWエキサイトマッチ", slug: "wowow-boxing-2026-09-12", body: "放送日時：9月12日（土）午後10時30分" }).date, "2026-09-12");
assert.equal(viewingFacts({ ...article, title: "WOWOWエキサイトマッチ", slug: "wowow-boxing-2026-09-12", body: "放送日時：9月7日（月）午後9時" }).date, "");
const old = { ...article, slug: "past-event", body: "開催日：2026年9月21日\n配信：Lemino" };
const undated = { ...article, slug: "undated-event", body: "開催日は未発表" };
const groups = scheduleGroups([article, old, undated], now);
assert.deepEqual(groups.upcoming.map((a) => a.slug), [article.slug]);
assert.deepEqual(groups.past.map((a) => a.slug), [old.slug]);
assert.equal(groups.undated.length, 1);
assert.equal(scheduleGroups([{ ...article, title: "興行延期" }], now).upcoming.length, 0);

const guide = viewingGuideHtml(article, null, now);
assert.match(guide, /興行開始/);
assert.match(guide, /放送・配信開始/);
assert.ok(guide.includes(`href="${streamingLinks.lemino}"`));
assert.match(guide, /article-viewing-guide/);
assert.ok(!guide.includes('target="_blank"'));
const noAffiliate = viewingGuideHtml({ ...article, affiliate_links: [] }, null, now);
assert.ok(!noAffiliate.includes("data-boxsoku-affiliate-service"));
assert.equal(viewingGuideHtml({ ...article, title: "選手の近況【NEWS】" }, null, now), "");
assert.ok(!viewingGuideHtml(old, null, now).includes("article-viewing-guide"));
assert.match(viewingGuideHtml(old, null, now), /予定日を過ぎた/);
const free = { ...article, body: article.body + "\n視聴条件：無料配信" };
assert.equal(viewingFacts(free).free, true);
assert.ok(!viewingGuideHtml(free, null, now).includes("article-viewing-guide"));
assert.equal(viewingFacts({ ...article, body: article.body + "\n視聴条件：初月無料" }).free, false);
assert.ok(!viewingGuideHtml({ ...article, body: article.body + "\n会場：<script>bad()</script>" }, null, now).includes("<script>"));
assert.match(officialAnnouncementsHtml(now), /公式の大会情報/);
assert.equal(officialAnnouncementsHtml(new Date("2026-11-26T15:00:00Z")), "");
assert.equal(officialAnnouncementsHtml(now, "wowow"), "");
const grouped = groupedScheduleHtml([old, article], (a) => `<article>${a.slug}</article>`, now);
assert.ok(grouped.indexOf(article.slug) < grouped.indexOf(old.slug));
assert.match(grouped, /<details class="watch-archive"/);

const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async () => Response.json([article, old, { ...article, slug: "news", title: "Leminoのニュース【NEWS】" }]);
  const response = await renderListingPage({ env: { SUPABASE_URL: "https://example.supabase.co", SUPABASE_ANON_KEY: "public-key" }, request: new Request("https://boxsoku.com/boxing-broadcast") }, "broadcast");
  const html = await response.text();
  assert.match(html, /data-server-rendered="true"/);
  assert.match(html, /viewing-guide\.css/);
  assert.ok(!html.includes('<article class="retro-post retro-post-news">'));
  for (const script of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(script[1]);
  assert.ok(!html.includes('"email"'));
} finally { globalThis.fetch = originalFetch; }

const watch = await watchPage({ request: new Request("https://boxsoku.com/watch") });
assert.equal(watch.status, 200);
assert.match(await watch.text(), /既に契約中/);
const publicFiles = ["config.js", "site.js", "about.html", "contact.html", "functions/_shared/listing-page.js", "functions/news/[slug].js", "functions/watch.js", "viewing-guide.js"];
for (const file of publicFiles) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  assert.ok(!/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(source), `public email in ${file}`);
  assert.ok(!/C:[\\/]Users|file:\/\//i.test(source), `local path in ${file}`);
}
const about = fs.readFileSync(new URL("../about.html", import.meta.url), "utf8");
JSON.parse(about.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
console.log("Viewing guide, event expiry, affiliate ownership and public privacy checks passed");
